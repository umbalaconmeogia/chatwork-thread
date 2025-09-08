const fs = require('fs');
const path = require('path');

// Simple 16x16 PNG with blue background (base64 encoded)
const icon16Base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFYSURBVDhNpZM9SwNBEIafgwQSCxsLwcJCG1sLG1sLbSy0sdDGQhsLbSy0sdDGQhsLbSy0sdDGQhsLbSy0sdDGQhsLbSy0sdDGQhsLbSy0sdDGQhsLbSy0sdDGQhsLbSy0sdDGQhsLbSy0sdDGQhsLbSy0sVBEBERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABERABEQgfV7XQOGqQFBsAAAAASUVORK5CYII=';

// Create icons directory
const iconsDir = path.join(__dirname, 'src', 'chrome', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Create minimal PNG files
const sizes = [16, 32, 48, 128];

// Very simple PNG data for each size (just a colored square)
const createMinimalPNG = (size) => {
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk (Image Header)
    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0); // chunk length
    ihdr.write('IHDR', 4);
    ihdr.writeUInt32BE(size, 8); // width
    ihdr.writeUInt32BE(size, 12); // height
    ihdr.writeUInt8(8, 16); // bit depth
    ihdr.writeUInt8(2, 17); // color type (RGB)
    ihdr.writeUInt8(0, 18); // compression
    ihdr.writeUInt8(0, 19); // filter
    ihdr.writeUInt8(0, 20); // interlace
    // CRC (simplified)
    ihdr.writeUInt32BE(0, 21);
    
    // IDAT chunk (minimal image data)
    const idat = Buffer.from([
        0x00, 0x00, 0x00, 0x0E, // chunk length
        0x49, 0x44, 0x41, 0x54, // "IDAT"
        0x78, 0x9C, 0x62, 0xF8, 0x0F, 0x00, 0x01, 0x01, 0x01, 0x00, // minimal compressed data
        0x00, 0x00, 0x00, 0x00 // CRC
    ]);
    
    // IEND chunk
    const iend = Buffer.from([
        0x00, 0x00, 0x00, 0x00, // chunk length
        0x49, 0x45, 0x4E, 0x44, // "IEND"
        0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    return Buffer.concat([signature, ihdr, idat, iend]);
};

// Create all icon sizes
sizes.forEach(size => {
    try {
        let pngData;
        
        if (size === 16) {
            // Use the base64 data for 16x16
            pngData = Buffer.from(icon16Base64, 'base64');
        } else {
            // Create simple PNG for other sizes
            pngData = createMinimalPNG(size);
        }
        
        const filePath = path.join(iconsDir, `icon${size}.png`);
        fs.writeFileSync(filePath, pngData);
        console.log(`✓ Created icon${size}.png`);
        
    } catch (error) {
        console.error(`✗ Failed to create icon${size}.png:`, error.message);
    }
});

console.log('\nIcon creation completed!');
console.log('You can now load the extension in Chrome.');

// Clean up temporary files
const tempFiles = ['create-icons.js', 'create-png-icons.js', 'create-simple-icons.js'];
tempFiles.forEach(file => {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
    }
});

console.log('Temporary files cleaned up.');
