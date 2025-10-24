# Journal Editor Features

## Overview

The Deltalytix journal editor is built on TipTap, a headless rich text editor framework. It now includes advanced features for managing images and creating structured layouts using tables.

## Image Features

### Resizable Images

Images in the journal can now be resized by clicking and dragging the edges. This feature is powered by the `tiptap-extension-resize-image` extension.

**How to use:**
1. Upload an image by clicking the image button in the toolbar
2. Click on the image to select it
3. Drag the corner or edge handles to resize the image
4. The image will maintain its aspect ratio while being resized

### Image Alignment

You can align images (and other content) using the alignment buttons in the toolbar:

- **Align Left** - Aligns content to the left side
- **Align Center** - Centers the content
- **Align Right** - Aligns content to the right side

**Keyboard shortcuts:**
- Left align: `Cmd/Ctrl + Shift + L`
- Center align: `Cmd/Ctrl + Shift + E`
- Right align: `Cmd/Ctrl + Shift + R`

## Table Features

### Creating Tables

Tables enable you to create grid layouts, side-by-side content, and structured information.

**How to create a table:**
1. Click the table button (grid icon) in the toolbar
2. A 3x3 table with a header row will be inserted at your cursor position
3. Click in any cell to start editing

### Table Manipulation

When you click inside a table cell, a table menu appears in the bubble menu with the following options:

#### Adding Rows and Columns
- **Add Column Before** - Inserts a new column to the left of the current cell
- **Add Column After** - Inserts a new column to the right of the current cell
- **Add Row Before** - Inserts a new row above the current cell
- **Add Row After** - Inserts a new row below the current cell

#### Deleting Rows and Columns
- **Delete Column** - Removes the current column
- **Delete Row** - Removes the current row
- **Delete Table** - Removes the entire table

### Side-by-Side Layouts

You can create side-by-side layouts using tables:

1. Insert a table with 1 row and 2 columns
2. Remove the header row if desired
3. Add your content (text, images, etc.) in each cell
4. Resize images as needed

**Example use cases:**
- Image on left, description on right
- Two images side by side for comparison
- Before/after trading screenshots
- Split-screen notes and analysis

## Best Practices

### Image Management
- Keep images reasonably sized to maintain journal performance
- Use meaningful alt text for accessibility
- Consider using tables to organize multiple images

### Table Usage
- Use header rows to label columns when appropriate
- Keep tables simple and focused on one concept
- Consider using alignment to improve readability

### Layout Tips
- Use tables for structured layouts and comparisons
- Use alignment for single images or paragraphs
- Combine features for rich, professional-looking journals

## Technical Details

### Extensions Used

- **ResizableImageExtension** (`tiptap-extension-resize-image`) - Provides image resizing functionality
- **Table** - Core table functionality
- **TableRow** - Table row support
- **TableHeader** - Header cell support  
- **TableCell** - Data cell support
- **TextAlign** - Content alignment (left, center, right)

### Styling

Tables are styled with:
- Fixed layout for consistent column widths
- Border-collapse for clean borders
- Word-break to handle long content
- Selected cell highlighting for better UX
- Resizable columns with visual handles

Images are styled with:
- Rounded corners for a modern look
- Shadow effects for depth
- Hover effects for interactivity
- Cursor pointer to indicate resizability

## Troubleshooting

### Images won't resize
- Make sure you've clicked on the image to select it first
- Check that resize handles are visible on the corners/edges

### Table menu doesn't appear
- Ensure you've clicked inside a table cell
- The menu appears in the bubble menu above selected content

### Layout looks broken
- Check that table cells contain valid content
- Try adjusting column widths by dragging the resize handles
- Consider simplifying complex nested structures

## Future Enhancements

Potential improvements being considered:
- Preset table layouts (2-column, 3-column, etc.)
- Image galleries with automatic grid layout
- Drag-and-drop image positioning
- Table templates for common use cases
- Image captions and annotations
