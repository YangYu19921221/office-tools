# 文档转换工具

一个基于 Flask 和 LibreOffice 的在线文档转换工具，支持多种文档格式的互相转换。

## 功能特点

- 支持多种文档格式：PDF、DOCX、TXT、PPT、PPTX
- 简单直观的用户界面
- 拖拽上传文件
- 实时转换进度显示
- 错误提示和处理

## 技术栈

- 后端：Python + Flask
- 转换引擎：LibreOffice
- 前端：HTML + CSS + JavaScript
- 依赖管理：pip

## 安装说明

1. 克隆仓库：
```bash
git clone git@github.com:YangYu19921221/office-tools.git
cd office-tools
```

2. 安装 Python 依赖：
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. 安装 LibreOffice：
```bash
# macOS
brew install libreoffice

# Ubuntu
sudo apt-get install libreoffice

# Windows
# 从 LibreOffice 官网下载安装包：https://www.libreoffice.org/
```

## 使用说明

1. 启动服务器：
```bash
python app.py
```

2. 打开浏览器访问：`http://localhost:5000`

3. 选择要转换的文件，选择目标格式，点击转换按钮

## 注意事项

- 确保已正确安装 LibreOffice
- 转换大文件可能需要较长时间
- 某些特殊格式的文档可能会影响转换质量

## 许可证

MIT License
