#!/usr/bin/env python3
import os
import sys
from fontTools import subset
from fontTools.ttLib import TTFont
import shutil

# Create subset directory if it doesn't exist
subset_dir = os.path.join('public', 'fonts', 'subset')
os.makedirs(subset_dir, exist_ok=True)

# Characters needed for the OG image
text = "SatoshiBitcon'sNaveCurrencyUDCNYEJPfomaedgGkl1234567890.,'-% "

# Font files to subset
fonts = [
    ('Montserrat-Bold.ttf', 'Montserrat-Bold.subset.ttf'),
    ('Montserrat-Light.ttf', 'Montserrat-Light.subset.ttf')
]

for src_filename, dst_filename in fonts:
    src_path = os.path.join('public', 'fonts', src_filename)
    dst_path = os.path.join(subset_dir, dst_filename)
    
    print(f"Subsetting {src_filename}...")
    
    # Check original size
    original_size = os.path.getsize(src_path)
    print(f"Original size: {original_size / 1024:.2f} KB")
    
    # Load the font to extract glyph names for the characters
    font = TTFont(src_path)
    
    # Get the subset options
    options = subset.Options()
    options.layout_features = ["*"]  # Keep all layout features
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6]  # Keep important name records
    options.recalc_bounds = True
    options.recalc_timestamp = False
    options.canonical_order = True
    
    # Subset the font
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    font.flavor = None  # Remove digital signature if any
    subsetter.subset(font)
    
    # Save the subsetted font
    font.save(dst_path)
    
    # Check the size of the subsetted font
    subset_size = os.path.getsize(dst_path)
    print(f"Subset size: {subset_size / 1024:.2f} KB")
    print(f"Reduction: {(1 - subset_size / original_size) * 100:.2f}%")
    print("-" * 50)

print("All fonts have been subsetted successfully!") 