from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import logging
from datetime import datetime
import subprocess
import tempfile
import shutil

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# 配置 Flask
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 限制上传文件大小为 16MB
app.config['JSON_AS_ASCII'] = False

# 确保上传文件夹存在
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logger.info(f'Created upload folder: {UPLOAD_FOLDER}')

ALLOWED_EXTENSIONS = {
    'txt': ['pdf', 'docx'],
    'docx': ['pdf', 'txt'],
    'pdf': ['txt', 'docx'],
    'ppt': ['pdf'],
    'pptx': ['pdf']
}

def allowed_file(filename, allowed_extensions=None):
    if allowed_extensions is None:
        allowed_extensions = ALLOWED_EXTENSIONS.keys()
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

@app.route('/')
def index():
    logger.info('Received request for index page')
    return jsonify({"message": "Document Conversion API is running"})

@app.route('/api/formats', methods=['GET', 'OPTIONS'])
def get_formats():
    logger.info('Received request for formats')
    
    if request.method == 'OPTIONS':
        logger.debug('Handling OPTIONS request for formats')
        return '', 204
        
    try:
        logger.debug(f'Returning formats: {ALLOWED_EXTENSIONS}')
        response = jsonify(ALLOWED_EXTENSIONS)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
    except Exception as e:
        logger.error(f'Error getting formats: {str(e)}', exc_info=True)
        return jsonify({'error': str(e)}), 500

def convert_with_soffice(input_path, output_format):
    """使用 LibreOffice 进行文件转换"""
    try:
        # 创建临时目录用于输出
        output_dir = tempfile.mkdtemp()
        logger.info(f"Created temp directory: {output_dir}")
        
        # 使用完整的 soffice 路径
        soffice_path = '/usr/local/bin/soffice'
        
        # 设置转换格式和过滤器
        if output_format == 'pdf':
            convert_to = 'pdf:writer_pdf_Export'
        elif output_format == 'docx':
            convert_to = 'docx'  # 简化 docx 转换格式
        elif output_format == 'txt':
            convert_to = 'txt:Text'
        else:
            convert_to = output_format
            
        logger.info(f"Converting from {os.path.splitext(input_path)[1]} to {convert_to}")
        
        # 构建转换命令
        cmd = [
            soffice_path,
            '--headless',
            '--norestore',
            '--invisible',
            '--nodefault',
            '--nofirststartwizard',
            '--convert-to',
            convert_to,
            '--outdir',
            output_dir,
            input_path
        ]
        
        logger.info(f'Running conversion command: {" ".join(cmd)}')
        
        # 设置环境变量
        env = os.environ.copy()
        env['HOME'] = os.path.expanduser('~')
        
        # 执行转换
        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            env=env
        )
        
        logger.info(f"Process stdout: {process.stdout}")
        if process.stderr:
            logger.warning(f"Process stderr: {process.stderr}")
        
        # 获取输出文件路径
        filename = os.path.basename(input_path)
        output_filename = f"{os.path.splitext(filename)[0]}.{output_format}"
        output_path = os.path.join(output_dir, output_filename)
        
        logger.info(f"Expected output path: {output_path}")
        
        # 检查输出文件
        if not os.path.exists(output_path):
            error_msg = process.stderr or "Unknown conversion error"
            logger.error(f"Output file not created: {error_msg}")
            # 列出输出目录内容
            logger.info(f"Output directory contents: {os.listdir(output_dir)}")
            raise Exception(f"Conversion failed: {error_msg}")
            
        # 验证输出文件大小
        file_size = os.path.getsize(output_path)
        logger.info(f"Output file size: {file_size} bytes")
        
        if file_size == 0:
            raise Exception("Conversion failed: Output file is empty")
            
        return output_path, output_dir
        
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr or str(e)
        logger.error(f"Conversion process failed: {error_msg}")
        raise Exception(f"Conversion failed: {error_msg}")
    except Exception as e:
        logger.error(f"Error during conversion: {str(e)}")
        raise

@app.route('/api/convert', methods=['POST', 'OPTIONS'])
def convert_file():
    try:
        if 'file' not in request.files:
            logger.error("No file part in request")
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            logger.error("No selected file")
            return jsonify({'error': 'No selected file'}), 400
            
        target_format = request.form.get('format')
        if not target_format:
            logger.error("No target format specified")
            return jsonify({'error': 'No target format specified'}), 400
            
        # 检查文件类型
        allowed_extensions = {'txt', 'docx', 'pdf', 'ppt', 'pptx'}
        if not allowed_file(file.filename, allowed_extensions):
            logger.error(f"Invalid file type: {file.filename}")
            return jsonify({'error': 'Invalid file type'}), 400
            
        # 保存上传的文件
        input_dir = tempfile.mkdtemp()
        input_path = os.path.join(input_dir, secure_filename(file.filename))
        file.save(input_path)
        
        logger.info(f"File saved to: {input_path}")
        logger.info(f"Converting to format: {target_format}")
        
        try:
            # 检查 LibreOffice 是否可用
            subprocess.run(['which', 'soffice'], check=True, capture_output=True)
        except subprocess.CalledProcessError:
            logger.error("LibreOffice (soffice) not found")
            return jsonify({'error': 'LibreOffice not installed'}), 500
            
        try:
            # 执行转换
            output_path, temp_dir = convert_with_soffice(input_path, target_format)
            
            if not os.path.exists(output_path):
                logger.error(f"Output file not found: {output_path}")
                return jsonify({'error': 'Conversion failed - output file not found'}), 500
                
            # 检查输出文件大小
            if os.path.getsize(output_path) == 0:
                logger.error("Output file is empty")
                return jsonify({'error': 'Conversion failed - output file is empty'}), 500
                
            # 发送文件
            return send_file(
                output_path,
                as_attachment=True,
                download_name=f"{os.path.splitext(file.filename)[0]}.{target_format}"
            )
            
        except Exception as e:
            logger.error(f"Conversion error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
        finally:
            # 清理临时文件
            try:
                if 'input_dir' in locals():
                    shutil.rmtree(input_dir)
                if 'temp_dir' in locals():
                    shutil.rmtree(temp_dir)
            except Exception as e:
                logger.error(f"Error cleaning up temporary files: {str(e)}")
                
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        return jsonify({'error': 'Server error occurred'}), 500

@app.after_request
def after_request(response):
    logger.debug(f'Response status: {response.status_code}')
    logger.debug(f'Response headers: {dict(response.headers)}')
    return response

if __name__ == '__main__':
    logger.info('Starting Flask server...')
    app.run(host='127.0.0.1', port=5000, debug=True)
