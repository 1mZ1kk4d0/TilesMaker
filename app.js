const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

class MapTiles {
    constructor(imagePath, options = {}) {

        if (!fs.existsSync(imagePath)) {
            throw new Error('The image file does not exist.');
        }

        this.imagePath = imagePath;
        this.tilesPath = 'output';
        this.tileSize = 256;
        this.zoomMin = 0;
        this.zoomMax = 3;
        this.minImageSize = 256; // Tamanho mínimo da imagem

        Object.assign(this, options);
    }

    async process(cleanUp = false) {
        if (!fs.existsSync(this.tilesPath)) {
            fs.mkdirSync(this.tilesPath, { recursive: true });
        }

        console.log('MapTiler: Process. Start');
        await this.prepareZoomBaseImages();
        console.log('MapTiler: Create images for each zoom level. End');

        for (let i = this.zoomMin; i <= this.zoomMax; i++) {
            await this.tilesForZoom(i);
        }

        if (cleanUp) {
            this.removeZoomBaseImages();
        }

        console.log('MapTiler: Process. End');
    }

    async prepareZoomBaseImages() {
        const image = await loadImage(this.imagePath);
        const { width: imgWidth, height: imgHeight } = image;
        console.log('MapTiler: Main Image loaded');

        if (Math.min(imgWidth, imgHeight) < this.minImageSize) {
            throw new Error('Image is too small. Please use a larger image.');
        }

        for (let i = this.zoomMax; i >= this.zoomMin; i--) {
            const zoomLevel = i;
            const zoomDir = path.join(this.tilesPath, `${zoomLevel}`);
            if (!fs.existsSync(zoomDir)) {
                fs.mkdirSync(zoomDir, { recursive: true });
            }

            const tileSize = Math.pow(2, zoomLevel) * this.tileSize;
            const canvas = createCanvas(tileSize, tileSize);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, tileSize, tileSize);

            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(path.join(zoomDir, `${zoomLevel}.png`), buffer);

            console.log(`MapTiler: Created Image for zoom level: ${zoomLevel}`);
        }
    }

    removeZoomBaseImages() {
        for (let i = this.zoomMin; i <= this.zoomMax; i++) {
            const dirPath = path.join(this.tilesPath, `${i}`);
            if (fs.existsSync(dirPath)) {
                fs.rmdirSync(dirPath, { recursive: true });
            }
        }
    }

    async tilesForZoom(zoom) {
        const zoomDir = path.join(this.tilesPath, `${zoom}`);
        const imagePath = path.join(zoomDir, `${zoom}.png`);
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image for zoom level ${zoom} does not exist.`);
        }

        const image = await loadImage(imagePath);
        const { width: imgWidth, height: imgHeight } = image;

        const xTiles = Math.ceil(imgWidth / this.tileSize);
        const yTiles = Math.ceil(imgHeight / this.tileSize);

        for (let ix = 0; ix < xTiles; ix++) {
            const xDir = path.join(zoomDir, `${ix}`);
            if (!fs.existsSync(xDir)) {
                fs.mkdirSync(xDir, { recursive: true });
            }

            for (let iy = 0; iy < yTiles; iy++) {
                const canvas = createCanvas(this.tileSize, this.tileSize);
                const ctx = canvas.getContext('2d');

                const cropX = ix * this.tileSize;
                const cropY = iy * this.tileSize;

                // Ajustar o recorte se o tile estiver fora dos limites da imagem
                const tileWidth = Math.min(this.tileSize, imgWidth - cropX);
                const tileHeight = Math.min(this.tileSize, imgHeight - cropY);

                ctx.drawImage(image, cropX, cropY, tileWidth, tileHeight, 0, 0, this.tileSize, this.tileSize);
                const tileBuffer = canvas.toBuffer('image/png');

                const tilePath = path.join(xDir, `${iy}.png`);
                fs.writeFileSync(tilePath, tileBuffer);
            }
        }

        console.log(`MapTiler: Created Tiles for zoom level: ${zoom}`);
    }
}

// Exemplo de uso
new MapTiles("main.png", {
    tilesPath: 'output', // Caminho para salvar os tiles
    tileSize: 256,       // Tamanho de cada tile (padrão é 256x256)
    zoomMin: 1,          // Nível de zoom mínimo
    zoomMax: 6,          // Nível de zoom máximo
    minImageSize: 512    // Tamanho mínimo da imagem
}).process();
