document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const formatSelect = document.getElementById('formatSelect');
    const convertButton = document.getElementById('convertButton');
    const progressBar = document.getElementById('progressBar');
    const progressBarFill = document.getElementById('progressBarFill');
    const errorMessage = document.getElementById('errorMessage');

    let supportedFormats = null;

    // 获取支持的格式
    console.log('Fetching supported formats...');
    fetch('http://127.0.0.1:5000/api/formats', {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        credentials: 'omit'
    })
    .then(response => {
        console.log('Format response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(formats => {
        supportedFormats = formats;
        console.log('Supported formats:', formats);
    })
    .catch(error => {
        showError('无法获取支持的格式列表: ' + error.message);
        console.error('Error fetching formats:', error);
    });

    // 文件拖拽处理
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // 点击上传
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        console.log('File input change event triggered');
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // 处理上传的文件
    function handleFile(file) {
        console.log('Handling file:', file.name, file.type, file.size);
        
        // 显示文件信息
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';

        // 获取文件扩展名
        const extension = file.name.split('.').pop().toLowerCase();
        console.log('File extension:', extension);
        
        // 更新可用的目标格式
        updateTargetFormats(extension);

        // 存储文件以供后续使用
        window.selectedFile = file;
    }

    // 更新目标格式选择
    function updateTargetFormats(sourceFormat) {
        console.log('Updating target formats for source format:', sourceFormat);
        console.log('Current supported formats:', supportedFormats);
        
        // 清空现有选项
        formatSelect.innerHTML = '<option value="">选择目标格式</option>';
        
        if (supportedFormats && supportedFormats[sourceFormat]) {
            supportedFormats[sourceFormat].forEach(format => {
                const option = document.createElement('option');
                option.value = format;
                option.textContent = format.toUpperCase();
                formatSelect.appendChild(option);
            });
            formatSelect.disabled = false;
            console.log('Available target formats:', supportedFormats[sourceFormat]);
        } else {
            formatSelect.disabled = true;
            showError('不支持该文件格式');
            console.log('No supported formats for:', sourceFormat);
        }
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 显示错误信息
    function showError(message) {
        console.error('Error message:', message);
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // 更新进度条
    function updateProgress(percent) {
        console.log('Updating progress:', percent + '%');
        progressBarFill.style.width = `${percent}%`;
    }

    // 格式选择变化处理
    formatSelect.addEventListener('change', () => {
        const selectedFormat = formatSelect.value;
        console.log('Format selected:', selectedFormat);
        convertButton.disabled = !selectedFormat;
    });

    // 转换按钮点击处理
    convertButton.addEventListener('click', () => {
        console.log('Convert button clicked');
        console.log('Selected file:', window.selectedFile);
        console.log('Selected format:', formatSelect.value);

        if (!window.selectedFile || !formatSelect.value) {
            showError('请选择文件和目标格式');
            return;
        }

        const formData = new FormData();
        formData.append('file', window.selectedFile);
        formData.append('format', formatSelect.value);

        console.log('FormData created:', {
            fileName: window.selectedFile.name,
            targetFormat: formatSelect.value
        });

        // 显示进度条
        progressBar.style.display = 'block';
        updateProgress(0);

        // 禁用转换按钮
        convertButton.disabled = true;

        console.log('Sending conversion request...');

        // 发送转换请求
        fetch('http://127.0.0.1:5000/api/convert', {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            body: formData
        })
        .then(response => {
            console.log('Conversion response status:', response.status);
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || '转换失败');
                });
            }
            return response.blob();
        })
        .then(blob => {
            console.log('Received blob:', blob.type, blob.size);
            
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `converted_${window.selectedFile.name.split('.')[0]}.${formatSelect.value}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // 重置界面
            updateProgress(100);
            setTimeout(() => {
                progressBar.style.display = 'none';
                convertButton.disabled = false;
            }, 1000);
            
            console.log('Conversion completed successfully');
        })
        .catch(error => {
            console.error('Conversion error details:', error);
            showError('转换失败：' + error.message);
            progressBar.style.display = 'none';
            convertButton.disabled = false;
        });
    });
});
