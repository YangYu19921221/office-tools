document.addEventListener('DOMContentLoaded', function() {
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    const cards = document.querySelectorAll('.card');

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        cards.forEach(card => {
            const title = card.querySelector('h2').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // 卡片点击事件
    cards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (!e.target.classList.contains('card-button')) {
                const button = this.querySelector('.card-button');
                button.click();
            }
        });

        const button = card.querySelector('.card-button');
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const tool = card.dataset.tool;
            handleToolClick(tool);
        });
    });
});

function handleToolClick(tool) {
    switch(tool) {
        case 'converter':
            alert('打开文档转换工具');
            // window.location.href = '/converter.html';
            break;
        case 'analyzer':
            alert('打开内容分析工具');
            // window.location.href = '/analyzer.html';
            break;
        case 'excel':
            alert('打开表格处理工具');
            // window.location.href = '/excel.html';
            break;
        case 'ocr':
            alert('打开OCR文字识别工具');
            // window.location.href = '/ocr.html';
            break;
    }
}
