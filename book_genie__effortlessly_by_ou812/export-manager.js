import { saveBookData } from './book-manager.js';

/* ...existing code... */

const defaultPromptFontSize = 10;

/* @tweakable coverImageWidth Width of the book cover in PDF export (pixels) */
const defaultCoverImageWidth = 200;

/* @tweakable coverImageMaxHeight Maximum height of the book cover in PDF export (pixels) */
const defaultCoverImageMaxHeight = 250;

/* @tweakable includeCoverInExport Whether to include the book cover image in exports */
const includeCoverInExport = true;

/* @tweakable coverImagePosition Position of cover in PDF ('top', 'after-prompt', 'before-chapters') */
const coverImagePosition = 'after-prompt';

/* @tweakable pdfPageMargins Margins for PDF pages in points {left, right, top, bottom} */
const pdfPageMargins = { left: 20, right: 20, top: 20, bottom: 20 };

/* @tweakable pdfTitleFontSize Font size for the book title in PDF */
const pdfTitleFontSize = 20;

/* @tweakable pdfBodyFontSize Base body font size for PDF text */
const pdfBodyFontSize = 12;

/* @tweakable pdfLineHeight Line height in points for body text lines */
const pdfLineHeight = 6;

/* @tweakable pdfParagraphSpacing Extra spacing (points) after each paragraph */
const pdfParagraphSpacing = 8;

/* @tweakable pdfImageMaxWidth Maximum width for embedded images (points) */
const pdfImageMaxWidth = 150;

/* @tweakable pdfImageAspect Default aspect ratio height multiplier for images (width * aspect) if intrinsic size unknown */
const pdfImageAspect = 0.6;

/* @tweakable pdfAddPageNumbers Add centered page numbers at the bottom of each page */
const pdfAddPageNumbers = true;

/* @tweakable pdfPageFormat PDF page format ('a4','letter','legal', array [w,h]) */
const pdfPageFormat = 'a4';

/* @tweakable pdfOrientation PDF orientation ('p' for portrait, 'l' for landscape) */
const pdfOrientation = 'p';

/* @tweakable pdfAutoPageBreak Automatically add pages as text reaches the bottom margin */
const pdfAutoPageBreak = true;

/* @tweakable pdfFontFamily Base PDF font family ('Times' | 'Helvetica' | 'Courier') */
const pdfFontFamily = 'Times';

// @tweakable pdfAllowExternalImages Allow PDF export to include images from external origins
const pdfAllowExternalImages = true;

// @tweakable pdfAllowedImageOrigins Origins allowed for image embedding when pdfAllowExternalImages is true
const pdfAllowedImageOrigins = [window.location.origin, 'https://images.websim.com', 'https://screenshots.websim.com'];

// @tweakable pdfStrictImageOrigin If true, disallow any image whose origin is not in pdfAllowedImageOrigins
const pdfStrictImageOrigin = true;

/**
 * Extracts the book cover image URL from the body background
 * @returns {string|null} The cover image URL or null if not found
 */
async function getBookCoverImageUrl() {
    if (!includeCoverInExport) return null;
    
    const bodyBg = document.body.style.backgroundImage;
    if (!bodyBg || bodyBg === 'none') return null;
    
    const urlMatch = bodyBg.match(/url\("?(.+?)"?\)/);
    return urlMatch ? urlMatch[1] : null;
}

/**
 * Converts image URL to data URL for embedding
 * @param {string} imageUrl - The image URL to convert
 * @returns {Promise<string>} Data URL of the image
 */
async function imageUrlToDataUrl(imageUrl) {
    try {
        // Enforce optional origin allowlist to avoid CORS-related crashes
        if (pdfStrictImageOrigin || !pdfAllowExternalImages) {
            const u = new URL(imageUrl, window.location.href);
            const allowed = pdfAllowExternalImages && pdfAllowedImageOrigins.some(o => o === u.origin);
            if (!allowed) {
                console.warn('Skipping image due to origin policy:', imageUrl);
                return null;
            }
        }
        const response = await fetch(imageUrl, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.warn('Failed to convert image to data URL:', error);
        return null;
    }
}

/* @tweakable pdfImageFormatAutoDetect Try to auto-detect image format from the data URL (PNG/JPEG) */
const pdfImageFormatAutoDetect = true;

function detectImageFormat(dataUrl) {
    if (!pdfImageFormatAutoDetect || !dataUrl) return 'JPEG';
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
    return 'JPEG';
}

/* Helper: ensure we have space left on the current page; adds a page if needed */
function ensurePageSpace(doc, y, bottomMargin, minRequired = 30) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y > pageHeight - bottomMargin - minRequired) {
        doc.addPage();
        return pdfPageMargins.top;
    }
    return y;
}

/* Helper: write multiline block with line-height and paragraph spacing */
function writeTextBlock(doc, text, x, y, maxWidth) {
    const lines = doc.splitTextToSize(text, maxWidth);
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = pdfPageMargins.bottom;
    const needed = pdfLineHeight + pdfParagraphSpacing;

    lines.forEach((ln) => {
        if (pdfAutoPageBreak && (y > (pageHeight - bottomMargin - pdfLineHeight))) {
            doc.addPage();
            y = pdfPageMargins.top;
        }
        doc.text(ln, x, y);
        y += pdfLineHeight;
    });
    return y + pdfParagraphSpacing;
}

/**
 * Initializes the export button and popup functionality
 */
export function initializeExportButton() {
    const exportButton = document.getElementById('export-button');
    if (!exportButton) return;

    exportButton.addEventListener('click', () => {
        showExportPopup();
    });
}

/**
 * Shows the export options popup
 */
function showExportPopup() {
    // Remove existing popup if any
    const existingPopup = document.querySelector('.export-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    const popup = document.createElement('div');
    popup.className = 'export-popup';
    popup.style.display = 'flex';

    popup.innerHTML = `
        <div class="export-content">
            <button class="popup-close-button">&times;</button>
            <h2>Export Your Book</h2>
            <div class="export-description">
                <p>Choose your preferred export format:</p>
            </div>
            <div class="export-options">
                <div class="export-option">
                    <h3><i class="fas fa-file-pdf"></i> PDF Export</h3>
                    <p>Export your book as a PDF document with proper formatting, images, and cover.</p>
                    <div class="export-option-settings">
                        <label><input type="checkbox" id="pdf-include-cover" checked> Include book cover</label>
                        <label><input type="checkbox" id="pdf-include-images" checked> Include chapter images</label>
                        <label><input type="checkbox" id="pdf-include-prompt" checked> Include original prompt</label>
                    </div>
                    <button class="export-format-button" data-format="pdf">Export as PDF</button>
                </div>
                <div class="export-option">
                    <h3><i class="fas fa-file-code"></i> HTML Export</h3>
                    <p>Export as a standalone HTML file that can be opened in any web browser.</p>
                    <div class="export-option-settings">
                        <label><input type="checkbox" id="html-include-cover" checked> Include book cover</label>
                        <label><input type="checkbox" id="html-include-images" checked> Include chapter images</label>
                        <label><input type="checkbox" id="html-styling" checked> Include CSS styling</label>
                    </div>
                    <button class="export-format-button" data-format="html">Export as HTML</button>
                </div>
                <div class="export-option">
                    <h3><i class="fas fa-file-alt"></i> Plain Text Export</h3>
                    <p>Export as a simple text file with all chapter content.</p>
                    <div class="export-option-settings">
                        <label><input type="checkbox" id="txt-include-prompt" checked> Include original prompt</label>
                        <label><input type="checkbox" id="txt-chapter-numbers" checked> Include chapter numbers</label>
                    </div>
                    <button class="export-format-button" data-format="txt">Export as Text</button>
                </div>
            </div>
            <div class="export-status" id="export-status" style="display: none;">
                <div class="loading-spinner"></div>
                <span>Preparing export...</span>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    // Add event listeners
    const closeButton = popup.querySelector('.popup-close-button');
    closeButton.addEventListener('click', () => popup.remove());

    popup.addEventListener('click', (e) => {
        if (e.target === popup) popup.remove();
    });

    // Export format buttons
    popup.querySelectorAll('.export-format-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const format = e.target.dataset.format;
            handleExport(format);
        });
    });
}

/**
 * Handles the export process for different formats
 */
async function handleExport(format) {
    const statusDiv = document.getElementById('export-status');
    statusDiv.style.display = 'flex';

    try {
        switch (format) {
            case 'pdf':
                await exportToPDF();
                break;
            case 'html':
                await exportToHTML();
                break;
            case 'txt':
                await exportToText();
                break;
            default:
                throw new Error('Unknown export format');
        }
        
        statusDiv.innerHTML = '<span style="color: green;">✓ Export completed successfully!</span>';
        setTimeout(() => {
            document.querySelector('.export-popup')?.remove();
        }, 2000);
    } catch (error) {
        console.error('Export error:', error);
        statusDiv.innerHTML = '<span style="color: red;">✗ Export failed: ' + error.message + '</span>';
    }
}

/**
 * Exports the book as a PDF
 */
async function exportToPDF() {
    let jsPDFCtor;
    try {
        const mod = await import('jspdf');
        jsPDFCtor = (typeof mod === 'function')
            ? mod
            : (mod.jsPDF || (mod.default && (mod.default.jsPDF || mod.default)));
    } catch (error) {
        console.warn('jsPDF ESM import failed; trying the UMD build:', error);
        jsPDFCtor = window.jspdf?.jsPDF;
        if (!jsPDFCtor) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Unable to load jsPDF from the fallback CDN'));
                document.head.appendChild(script);
            });
            jsPDFCtor = window.jspdf?.jsPDF;
        }
    }
    if (!jsPDFCtor) throw new Error('jsPDF failed to load');
    const doc = new jsPDFCtor({ orientation: pdfOrientation, unit: 'pt', format: pdfPageFormat });

    // apply font family early
    try { doc.setFont(pdfFontFamily); } catch (_) { /* fallback to default */ }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = pdfPageMargins.left;
    const marginRight = pdfPageMargins.right;
    const marginTop = pdfPageMargins.top;
    const marginBottom = pdfPageMargins.bottom;
    let yPosition = marginTop;
    
    const titleElement = document.querySelector('h1');
    const bookTitle = titleElement ? titleElement.textContent : 'Untitled Book';
    
    // Title
    doc.setFontSize(pdfTitleFontSize);
    doc.setFont(undefined, 'bold');
    doc.text(bookTitle, marginLeft, yPosition);
    yPosition += (pdfTitleFontSize > 14 ? pdfTitleFontSize : 18);

    // Cover
    const includeCover = document.getElementById('pdf-include-cover')?.checked;
    if (includeCover) {
        const coverUrl = await getBookCoverImageUrl();
        if (coverUrl) {
            try {
                const coverDataUrl = await imageUrlToDataUrl(coverUrl);
                if (coverDataUrl) {
                    const coverWidth = Math.min(defaultCoverImageWidth, pageWidth - marginLeft - marginRight);
                    const coverHeight = Math.min(coverWidth * 0.6, defaultCoverImageMaxHeight);
                    const coverX = (pageWidth - coverWidth) / 2;
                    yPosition = ensurePageSpace(doc, yPosition, marginBottom, coverHeight + 20);
                    doc.addImage(coverDataUrl, detectImageFormat(coverDataUrl), coverX, yPosition, coverWidth, coverHeight);
                    yPosition += coverHeight + 20;
                }
            } catch (error) {
                console.warn('Failed to add cover image to PDF (skipped):', error);
            }
        }
    }

    // Prompt
    const includePrompt = document.getElementById('pdf-include-prompt')?.checked;
    if (includePrompt) {
        const inputText = document.getElementById('input-text');
        if (inputText?.value) {
            doc.setFontSize(pdfBodyFontSize);
            doc.setFont(undefined, 'normal');
            doc.text('Original Prompt:', marginLeft, yPosition);
            yPosition += 8;
            const maxTextWidth = pageWidth - marginLeft - marginRight;
            const promptYStart = yPosition;
            inputText.value.split(/\n\s*\n/).forEach(block => {
                yPosition = ensurePageSpace(doc, yPosition, marginBottom);
                yPosition = writeTextBlock(doc, block, marginLeft, yPosition, maxTextWidth);
            });
            if (yPosition === promptYStart) yPosition += pdfParagraphSpacing;
        }
    }

    // Chapters
    const chapters = document.querySelectorAll('.chapter');
    const includeImages = document.getElementById('pdf-include-images')?.checked;
    doc.setFontSize(pdfBodyFontSize);
    doc.setFont(undefined, 'normal');

    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const chapterContent = chapter.querySelector('.chapter-content');
        if (!chapterContent) continue;

        // Title
        const titleEl = chapterContent.querySelector('h2');
        if (titleEl) {
            yPosition = ensurePageSpace(doc, yPosition, marginBottom, pdfTitleFontSize + 10);
            doc.setFont(undefined, 'bold');
            doc.setFontSize(16);
            const lines = doc.splitTextToSize(titleEl.textContent, pageWidth - marginLeft - marginRight);
            lines.forEach((ln) => {
                doc.text(ln, marginLeft, yPosition);
                yPosition += 8;
            });
            yPosition += 2;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(pdfBodyFontSize);
        }

        // Paragraphs
        const maxTextWidth = pageWidth - marginLeft - marginRight;
        const paragraphs = chapterContent.querySelectorAll('p');
        paragraphs.forEach(p => {
            const text = p.textContent || '';
            if (!text.trim()) return;
            yPosition = ensurePageSpace(doc, yPosition, marginBottom);
            yPosition = writeTextBlock(doc, text, marginLeft, yPosition, maxTextWidth);
        });

        // Images
        if (includeImages) {
            const images = chapterContent.querySelectorAll('img');
            for (const img of images) {
                try {
                    const data = await imageUrlToDataUrl(img.src);
                    if (!data) continue;
                    const fmt = detectImageFormat(data);
                    const imgW = Math.min(pdfImageMaxWidth, pageWidth - marginLeft - marginRight);
                    const imgH = imgW * pdfImageAspect;
                    yPosition = ensurePageSpace(doc, yPosition, marginBottom, imgH + 10);
                    doc.addImage(data, fmt, marginLeft, yPosition, imgW, imgH);
                    yPosition += imgH + 10;
                } catch (e) {
                    console.warn('Image skipped in PDF:', e);
                }
            }
        }

        // Spacer between chapters
        yPosition += 12;
    }

    // Page numbers (optional)
    if (pdfAddPageNumbers) {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const pageW = doc.internal.pageSize.getWidth(); // recalc per page
            const pageH = doc.internal.pageSize.getHeight();
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const label = `Page ${i} of ${pageCount}`;
            const tw = doc.getTextWidth(label);
            doc.text(label, (pageW - tw) / 2, pageH - 6);
        }
    }

    doc.save(`${bookTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

/**
 * Exports the book as HTML
 */
async function exportToHTML() {
    const titleElement = document.querySelector('h1');
    const bookTitle = titleElement ? titleElement.textContent : 'Untitled Book';
    
    const includeCover = document.getElementById('html-include-cover')?.checked;
    const includeImages = document.getElementById('html-include-images')?.checked;
    const includeStyling = document.getElementById('html-styling')?.checked;
    
    let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${bookTitle}</title>`;
    
    if (includeStyling) {
        htmlContent += `
    <style>
        body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { text-align: center; color: #333; border-bottom: 3px solid #333; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        p { margin-bottom: 15px; text-align: justify; }
        .book-cover { text-align: center; margin: 20px 0; }
        .book-cover img { max-width: 400px; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .chapter-image { text-align: center; margin: 20px 0; }
        .chapter-image img { max-width: 100%; height: auto; border-radius: 4px; }
    </style>`;
    }
    
    htmlContent += `
</head>
<body>
    <h1>${bookTitle}</h1>`;
    
    // Add cover image
    if (includeCover) {
        const coverUrl = await getBookCoverImageUrl();
        if (coverUrl) {
            try {
                const coverDataUrl = await imageUrlToDataUrl(coverUrl);
                if (coverDataUrl) {
                    htmlContent += `
    <div class="book-cover">
        <img src="${coverDataUrl}" alt="Book Cover">
    </div>`;
                }
            } catch (error) {
                console.warn('Failed to add cover image to HTML:', error);
            }
        }
    }
    
    // Add chapters
    const chapters = document.querySelectorAll('.chapter');
    
    for (const chapter of chapters) {
        const chapterContent = chapter.querySelector('.chapter-content');
        if (!chapterContent) continue;
        
        // Add chapter title
        const titleElement = chapterContent.querySelector('h2');
        if (titleElement) {
            htmlContent += `\n    <h2>${titleElement.textContent}</h2>`;
        }
        
        // Add paragraphs and images
        const childNodes = Array.from(chapterContent.childNodes);
        for (const node of childNodes) {
            if (node.tagName === 'P') {
                htmlContent += `\n    <p>${node.innerHTML}</p>`;
            } else if (includeImages && node.tagName === 'IMG') {
                try {
                    const imgDataUrl = await imageUrlToDataUrl(node.src);
                    if (imgDataUrl) {
                        htmlContent += `\n    <div class="chapter-image"><img src="${imgDataUrl}" alt="Chapter Image"></div>`;
                    }
                } catch (error) {
                    console.warn('Failed to convert image for HTML export:', error);
                }
            } else if (includeImages && node.classList?.contains('image-container')) {
                const img = node.querySelector('img');
                if (img) {
                    try {
                        const imgDataUrl = await imageUrlToDataUrl(img.src);
                        if (imgDataUrl) {
                            htmlContent += `\n    <div class="chapter-image"><img src="${imgDataUrl}" alt="Chapter Image"></div>`;
                        }
                    } catch (error) {
                        console.warn('Failed to convert image for HTML export:', error);
                    }
                }
            }
        }
    }
    
    htmlContent += `
</body>
</html>`;
    
    // Download the HTML file
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookTitle.replace(/[^a-z0-9]/gi, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Exports the book as plain text
 */
async function exportToText() {
    const titleElement = document.querySelector('h1');
    const bookTitle = titleElement ? titleElement.textContent : 'Untitled Book';
    
    const includePrompt = document.getElementById('txt-include-prompt')?.checked;
    const includeChapterNumbers = document.getElementById('txt-chapter-numbers')?.checked;
    
    let textContent = `${bookTitle}\n${'='.repeat(bookTitle.length)}\n\n`;
    
    // Add prompt if enabled
    if (includePrompt) {
        const inputText = document.getElementById('input-text');
        if (inputText?.value) {
            textContent += `Original Prompt:\n${inputText.value}\n\n`;
        }
    }
    
    // Add chapters
    const chapters = document.querySelectorAll('.chapter');
    
    chapters.forEach((chapter, index) => {
        const chapterContent = chapter.querySelector('.chapter-content');
        if (!chapterContent) return;
        
        // Add chapter title
        const titleElement = chapterContent.querySelector('h2');
        if (titleElement) {
            const chapterTitle = includeChapterNumbers 
                ? titleElement.textContent 
                : titleElement.textContent.replace(/^\d+\.\s*/, '');
            textContent += `${chapterTitle}\n${'-'.repeat(chapterTitle.length)}\n\n`;
        }
        
        // Add paragraphs
        const paragraphs = chapterContent.querySelectorAll('p');
        paragraphs.forEach(p => {
            textContent += `${p.textContent}\n\n`;
        });
        
        textContent += '\n';
    });
    
    // Download the text file
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookTitle.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}