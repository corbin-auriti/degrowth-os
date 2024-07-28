class CanvasElement {
    constructor(type, content, x, y, rotation = 0, width = null, height = null) {
        this.type = type;
        this.content = content;
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.width = width;
        this.height = height;
        this.element = null;
        this.zIndex = 0;
    }

    render() {
        const element = document.createElement('div');
        element.classList.add('canvas-element');
        element.style.left = `${this.x}px`;
        element.style.top = `${this.y}px`;
        element.style.transform = `rotate(${this.rotation}deg)`;

        switch (this.type) {
            case 'text':
                element.contentEditable = true;
                element.textContent = this.content;
                break;
            case 'image':
                const img = document.createElement('img');
                img.src = this.content;
                if (this.width && this.height) {
                    img.style.width = `${this.width}px`;
                    img.style.height = `${this.height}px`;
                }
                element.appendChild(img);
                break;
        }

        const controls = document.createElement('div');
        controls.classList.add('element-controls');

        const controlButtons = [
            { class: 'rotate-handle', icon: '↻', title: 'Rotate' },
            { class: 'layer-up', icon: '↑', title: 'Move Up' },
            { class: 'layer-down', icon: '↓', title: 'Move Down' },
            { class: 'delete-handle', icon: '×', title: 'Delete' }
        ];

        controlButtons.forEach(button => {
            const buttonElement = document.createElement('button');
            buttonElement.classList.add('control-button', button.class);
            buttonElement.innerHTML = button.icon;
            buttonElement.title = button.title;
            controls.appendChild(buttonElement);
        });

        element.appendChild(controls);

        const linkHandle = document.createElement('div');
        linkHandle.classList.add('link-handle');
        linkHandle.innerHTML = '⚯';
        linkHandle.title = 'Drag to link';
        element.appendChild(linkHandle);

        this.element = element;
        this.addEventListeners();
        return element;
    }

    addEventListeners() {
        this.addDragListeners();
        this.addRotateListeners();
        this.addEditListeners();

        const deleteHandle = this.element.querySelector('.delete-handle');
        deleteHandle.addEventListener('click', (e) => {
            e.stopPropagation();
            app.removeElement(this);
        });

        const layerUpHandle = this.element.querySelector('.layer-up');
        layerUpHandle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.zIndex++;
            this.element.style.zIndex = this.zIndex;
            app.saveToLocalStorage();
        });

        const layerDownHandle = this.element.querySelector('.layer-down');
        layerDownHandle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.zIndex--;
            this.element.style.zIndex = this.zIndex;
            app.saveToLocalStorage();
        });

        this.addLinkHandleListeners();
    }

    addLinkHandleListeners() {
        const linkHandle = this.element.querySelector('.link-handle');
        let isLinking = false;
        let linkLine;

        linkHandle.addEventListener('mousedown', (e) => {
            isLinking = true;
            linkLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            linkLine.setAttribute('stroke', 'black');
            linkLine.setAttribute('stroke-width', '2');
            app.canvas.appendChild(linkLine);
        });

        document.addEventListener('mousemove', (e) => {
            if (isLinking) {
                const rect = this.element.getBoundingClientRect();
                const startX = rect.left + rect.width / 2;
                const startY = rect.bottom;
                linkLine.setAttribute('x1', startX);
                linkLine.setAttribute('y1', startY);
                linkLine.setAttribute('x2', e.clientX);
                linkLine.setAttribute('y2', e.clientY);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isLinking) {
                isLinking = false;
                const targetElement = app.getElementAtPosition(e.clientX, e.clientY);
                if (targetElement && targetElement !== this) {
                    app.addLink(this, targetElement);
                }
                app.canvas.removeChild(linkLine);
            }
        });
    }

    addDragListeners() {
        let isDragging = false;
        let startX, startY;

        this.element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('rotate-handle')) return;
            isDragging = true;
            startX = e.clientX - this.x;
            startY = e.clientY - this.y;
            this.element.style.zIndex = 1000;
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.x = e.clientX - startX;
                this.y = e.clientY - startY;
                this.element.style.left = `${this.x}px`;
                this.element.style.top = `${this.y}px`;
                app.updateLinks();
                app.saveToLocalStorage();
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            this.element.style.zIndex = '';
        });
    }

    addRotateListeners() {
        const rotateHandle = this.element.querySelector('.rotate-handle');
        let isRotating = false;
        let startAngle;

        rotateHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isRotating = true;
            const rect = this.element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        });

        document.addEventListener('mousemove', (e) => {
            if (isRotating) {
                const rect = this.element.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                this.rotation += (angle - startAngle) * (180 / Math.PI);
                this.element.style.transform = `rotate(${this.rotation}deg)`;
                startAngle = angle;
                app.updateLinks();
                app.saveToLocalStorage();
            }
        });

        document.addEventListener('mouseup', () => {
            isRotating = false;
        });
    }

    addEditListeners() {
        if (this.type === 'text') {
            this.element.addEventListener('focus', () => {
                this.element.classList.add('editing');
            });

            this.element.addEventListener('blur', () => {
                this.element.classList.remove('editing');
                this.content = this.element.textContent;
                app.saveToLocalStorage();
            });
        }
    }

    toJSON() {
        return {
            type: this.type,
            content: this.content,
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            width: this.width,
            height: this.height,
            zIndex: this.zIndex
        };
    }
    
    static fromJSON(json) {
        const element = new CanvasElement(json.type, json.content, json.x, json.y, json.rotation, json.width, json.height);
        element.zIndex = json.zIndex || 0;
        return element;
    }

    toMarkdown() {
        let markdown = '';
        switch (this.type) {
            case 'text':
                markdown = `${this.content} @@ (${this.x}, ${this.y}, r${this.rotation}, z${this.zIndex})`;
                break;
            case 'image':
                markdown = `${this.content} @@ (${this.x}, ${this.y}, r${this.rotation}, z${this.zIndex})`;
                if (this.width && this.height) {
                    markdown += ` @@ ${this.width}x${this.height}`;
                }
                break;
        }
        return markdown;
    }
}

class CanvasApp {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.elements = [];
        this.links = [];
        this.bindEvents();
        this.loadFromLocalStorage();
    }

    bindEvents() {
        document.getElementById('addTextBtn').addEventListener('click', () => this.addText());
        document.getElementById('addImageBtn').addEventListener('click', () => this.addImage());
        document.getElementById('linkItemsBtn').addEventListener('click', () => this.linkItems());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveMarkdown());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadMarkdown());
    }

    addElement(element) {
        this.elements.push(element);
        this.canvas.appendChild(element.render());
        this.saveToLocalStorage();
    }

    addText() {
        const text = prompt('Enter text:');
        if (text) {
            const x = Math.random() * (this.canvas.clientWidth - 100);
            const y = Math.random() * (this.canvas.clientHeight - 50);
            this.addElement(new CanvasElement('text', text, x, y));
        }
    }

    addImage() {
        const url = prompt('Enter image URL:');
        if (url) {
            const x = Math.random() * (this.canvas.clientWidth - 100);
            const y = Math.random() * (this.canvas.clientHeight - 100);
            this.addElement(new CanvasElement('image', url, x, y, 0, 100, 100));
        }
    }

    linkItems() {
        if (this.elements.length < 2) {
            alert('You need at least two items to create a link.');
            return;
        }

        const index1 = prompt('Enter the index of the first item (0-based):');
        const index2 = prompt('Enter the index of the second item (0-based):');

        if (index1 !== null && index2 !== null) {
            const i1 = parseInt(index1);
            const i2 = parseInt(index2);

            if (i1 >= 0 && i1 < this.elements.length && i2 >= 0 && i2 < this.elements.length && i1 !== i2) {
                this.links.push([this.elements[i1], this.elements[i2]]);
                this.updateLinks();
                this.saveToLocalStorage();
            } else {
                alert('Invalid indices. Please try again.');
            }
        }
    }

    updateLinks() {
        const existingLines = this.canvas.querySelectorAll('.rainbow-line');
        existingLines.forEach(line => line.remove());

        this.links.forEach(([elem1, elem2]) => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            line.classList.add('rainbow-line');
            line.style.position = 'absolute';
            line.style.top = '0';
            line.style.left = '0';
            line.style.width = '100%';
            line.style.height = '100%';
            line.style.pointerEvents = 'none';

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const x1 = elem1.x + elem1.element.offsetWidth / 2;
            const y1 = elem1.y + elem1.element.offsetHeight / 2;
            const x2 = elem2.x + elem2.element.offsetWidth / 2;
            const y2 = elem2.y + elem2.element.offsetHeight / 2;
            path.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
            path.setAttribute('stroke', 'url(#rainbow)');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('fill', 'none');

            const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animate.setAttribute('attributeName', 'stroke-dashoffset');
            animate.setAttribute('from', '0');
            animate.setAttribute('to', '100');
            animate.setAttribute('dur', '5s');
            animate.setAttribute('repeatCount', 'indefinite');

            path.appendChild(animate);
            line.appendChild(this.createRainbowGradient());
            line.appendChild(path);
            this.canvas.appendChild(line);
        });
    }

    createRainbowGradient() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        linearGradient.id = 'rainbow';
        linearGradient.setAttribute('x1', '0%');
        linearGradient.setAttribute('y1', '0%');
        linearGradient.setAttribute('x2', '100%');
        linearGradient.setAttribute('y2', '0%');

        const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff'];
        colors.forEach((color, index) => {
            const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop.setAttribute('offset', `${(index / (colors.length - 1)) * 100}%`);
            stop.setAttribute('stop-color', color);
            linearGradient.appendChild(stop);
        });

        defs.appendChild(linearGradient);
        return defs;
    }

    clear() {
        this.elements = [];
        this.links = [];
        this.canvas.innerHTML = '';
        this.saveToLocalStorage();
    }

    saveToLocalStorage() {
        const data = {
            elements: this.elements.map(elem => elem.toJSON()),
            links: this.links.map(link => [this.elements.indexOf(link[0]), this.elements.indexOf(link[1])])
        };
        localStorage.setItem('canvasData', JSON.stringify(data));
    }
    
    loadFromLocalStorage() {
        const data = localStorage.getItem('canvasData');
        if (data) {
            const parsedData = JSON.parse(data);
            this.elements = parsedData.elements.map(CanvasElement.fromJSON);
            this.elements.forEach(elem => this.canvas.appendChild(elem.render()));
            this.links = parsedData.links.map(link => [this.elements[link[0]], this.elements[link[1]]]);
            this.updateLinks();
        }
    }

    saveMarkdown() {
        const markdown = this.elements.map(element => element.toMarkdown()).join('\n');
        const blob = new Blob([markdown], {type: 'text/markdown'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'canvas.md';
        a.click();
    }

    loadMarkdown() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = event => {
                this.parseMarkdown(event.target.result);
            };
            reader.readAsText(file);
        };
        input.click();
    }

    toMarkdown() {
        let markdown = this.elements.map(elem => elem.toMarkdown()).join('\n');
        markdown += '\n\n# Links\n';
        markdown += this.links.map(link => {
            const index1 = this.elements.indexOf(link[0]);
            const index2 = this.elements.indexOf(link[1]);
            return `${index1} -> ${index2}`;
        }).join('\n');
        return markdown;
    }

    parseMarkdown(markdown) {
        this.clear();
        const [elementsMarkdown, linksMarkdown] = markdown.split('# Links\n');
        
        const lines = elementsMarkdown.trim().split('\n');
        lines.forEach(line => {
            const match = line.match(/(.+) @@ \((\d+), (\d+), r(\d+), z(\d+)\)(?: @@ (\d+)x(\d+))?/);
            if (match) {
                const [_, content, x, y, rotation, zIndex, width, height] = match;
                let type = 'text';
                if (content.match(/\.(jpg|jpeg|png|gif)$/i)) {
                    type = 'image';
                }
                const element = new CanvasElement(type, content, parseInt(x), parseInt(y), parseInt(rotation), width ? parseInt(width) : null, height ? parseInt(height) : null);
                element.zIndex = parseInt(zIndex);
                this.addElement(element);
            }
        });
    
        if (linksMarkdown) {
            const linkLines = linksMarkdown.trim().split('\n');
            linkLines.forEach(line => {
                const [index1, index2] = line.split(' -> ').map(Number);
                if (this.elements[index1] && this.elements[index2]) {
                    this.addLink(this.elements[index1], this.elements[index2]);
                }
            });
        }
    
        this.updateLinks();
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDrop(e) {
        e.preventDefault();
        const x = e.clientX - this.canvas.offsetLeft;
        const y = e.clientY - this.canvas.offsetTop;

        if (e.dataTransfer.types.includes('text/plain')) {
            const text = e.dataTransfer.getData('text/plain');
            this.addElement(new CanvasElement('text', text, x, y));
        } else if (e.dataTransfer.types.includes('text/uri-list')) {
            const url = e.dataTransfer.getData('text/uri-list');
            if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
                this.addElement(new CanvasElement('image', url, x, y, 0, 100, 100));
            } else {
                // If it's not an image, add it as a text link
                this.addElement(new CanvasElement('text', url, x, y));
            }
        } else if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.addElement(new CanvasElement('image', event.target.result, x, y, 0, 100, 100));
                };
                reader.readAsDataURL(file);
            } else {
                // If it's not an image file, add its name as text
                this.addElement(new CanvasElement('text', file.name, x, y));
            }
        }
    }
}

const app = new CanvasApp();
