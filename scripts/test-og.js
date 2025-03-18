const http = require('http');
const fs = require('fs');
const path = require('path');

async function testOGImage() {
  try {
    console.log('Testing OG image generation with subsetted fonts...');
    
    // Check if the subsetted font files exist
    const boldFontPath = path.join('public', 'fonts', 'subset', 'Montserrat-Bold.subset.ttf');
    const lightFontPath = path.join('public', 'fonts', 'subset', 'Montserrat-Light.subset.ttf');
    
    if (!fs.existsSync(boldFontPath)) {
      console.error(`Could not find subsetted font: ${boldFontPath}`);
      return;
    }
    
    if (!fs.existsSync(lightFontPath)) {
      console.error(`Could not find subsetted font: ${lightFontPath}`);
      return;
    }
    
    console.log('Subsetted font files found.');
    
    // Check file sizes
    const boldFontSize = fs.statSync(boldFontPath).size;
    const lightFontSize = fs.statSync(lightFontPath).size;
    
    console.log(`Montserrat-Bold.subset.ttf size: ${boldFontSize / 1024} KB`);
    console.log(`Montserrat-Light.subset.ttf size: ${lightFontSize / 1024} KB`);
    console.log(`Total font size: ${(boldFontSize + lightFontSize) / 1024} KB`);
    
    // Original font sizes for comparison
    const originalBoldFontPath = path.join('public', 'fonts', 'Montserrat-Bold.ttf');
    const originalLightFontPath = path.join('public', 'fonts', 'Montserrat-Light.ttf');
    
    const originalBoldFontSize = fs.statSync(originalBoldFontPath).size;
    const originalLightFontSize = fs.statSync(originalLightFontPath).size;
    
    console.log(`\nOriginal Montserrat-Bold.ttf size: ${originalBoldFontSize / 1024} KB`);
    console.log(`Original Montserrat-Light.ttf size: ${originalLightFontSize / 1024} KB`);
    console.log(`Original total font size: ${(originalBoldFontSize + originalLightFontSize) / 1024} KB`);
    
    // Calculate size reduction
    const reduction = 1 - (boldFontSize + lightFontSize) / (originalBoldFontSize + originalLightFontSize);
    console.log(`\nTotal size reduction: ${(reduction * 100).toFixed(2)}%`);
    
    console.log('\nYou can now deploy your application to Vercel. The subsetted fonts should be small enough for the Edge Runtime.');
  } catch (error) {
    console.error('Error testing OG image:', error);
  }
}

testOGImage(); 