import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { WebsimSocket, useQuery } from '@websim/use-query';

const room = new WebsimSocket({
    schema: {
        books: {
            id: "uuid",
            title: "text",
            author: "text",
            genre: "text",
            language: "text",
            description: "text",
            image_url: "text",
            file_data: "jsonb",
            original_filename: "text",
            file_size: "integer",
            upload_date: "timestamptz",
            username: "text",
            user_id: "uuid",
            chapter_count: "integer",
            avg_chapter_size: "integer",
            download_count: "integer",
            avg_rating: "float4",
            review_count: "integer"
        },
        saved_books: {
            id: "uuid",
            book_id: "uuid",
            user_id: "uuid"
        },
        user_preferences: {
            id: "uuid",
            language: "text",
            theme: "text"
        },
        book_reviews: {
            id: "uuid",
            book_id: "uuid",
            user_id: "uuid",
            username: "text",
            rating: "integer",
            comment: "text",
            created_at: "timestamptz"
        }
    }
});

// Language detection utility
const detectLanguage = () => {
    return navigator.language || navigator.userLanguage || 'en';
};

// Language detection from content
const detectContentLanguage = (text) => {
    if (!text || typeof text !== 'string') return 'en';
    
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    
    // Expanded language patterns with more comprehensive word lists
    const languagePatterns = {
        'de': {
            words: /\b(und|der|die|das|ein|eine|ist|sind|von|zu|mit|auf|für|bei|oder|aber|auch|wenn|wie|über|nach|vor|zwischen|während|wegen|haben|haben|wird|wurde|werden|können|müssen|sollen|wollen|dürfen|mögen|lassen|gehen|kommen|sehen|wissen|sagen|machen|geben|nehmen|leben|arbeiten|spielen|lernen|verstehen|sprechen|hören|finden|denken|fühlen|bleiben|lieben|helfen|beginnen|enden|schreiben|lesen|fahren|laufen|stehen|sitzen|liegen|essen|trinken|schlafen|aufstehen|anziehen|ausziehen)\b/gi,
            threshold: 5
        },
        'en': {
            words: /\b(the|and|or|but|if|when|how|over|after|before|between|during|because|with|from|about|would|could|should|have|has|had|will|was|were|are|is|am|be|been|being|do|does|did|done|can|could|may|might|must|shall|should|will|would|get|got|give|gave|given|go|went|gone|come|came|take|took|taken|make|made|see|saw|seen|know|knew|known|think|thought|say|said|tell|told|work|worked|play|played|learn|learned|understand|understood|speak|spoke|spoken|hear|heard|find|found|feel|felt|stay|stayed|love|loved|help|helped|begin|began|begun|end|ended|write|wrote|written|read|drive|drove|driven|walk|walked|stand|stood|sit|sat|lie|lay|lain|eat|ate|eaten|drink|drank|drunk|sleep|slept|wake|woke|woken)\b/gi,
            threshold: 8
        },
        'es': {
            words: /\b(el|la|los|las|un|una|de|del|al|en|con|por|para|que|es|son|fue|fueron|ser|estar|tener|hacer|ir|venir|ver|saber|decir|dar|llevar|dejar|seguir|encontrar|llamar|venir|pensar|salir|volver|tomar|conocer|vivir|sentir|quedar|creer|hablar|llevar|comenzar|parecer|conseguir|servir|escribir|leer|trabajar|estudiar|jugar|caminar|correr|dormir|comer|beber|schlafen|aufstehen|anziehen|ausziehen)\b/gi,
            threshold: 5
        },
        'fr': {
            words: /\b(le|la|les|un|une|des|de|du|au|aux|en|avec|pour|par|que|qui|est|sont|était|étaient|être|avoir|faire|aller|venir|voir|savoir|dire|donner|prendre|vouloir|pouvoir|devoir|mettre|passer|regarder|trouver|rester|devenir|tenir|porter|parler|montrer|laisser|suivre|demander|comprendre|entendre|rendre|arriver|croire|paraître|connaître|vivre|mourir|naissance|mort|vie|âge|temps|moment|instant|période|époque|histoire|passé|présent|futur|mémoire|souvenir|oubli|rêve|cauchemar|sommeil|réveil|fatigue|repos|vacances|travail|école|étude|examen|note|diplôme|réussite|échec|succès|erreur|faute|excuse|pardon|merci|bonjour|bonsoir|salut|au|revoir|oui|non|peut|être|bien|sûr|d'accord|désolé|excusez|moi|s'il|vous|plaît|comment|allez|vous|ça|va|très|bien|et|vous|de|rien|je|vous|en|prie|bonne|nuit|bonne|journée|bon|week|end|bonnes|vacances|bon|voyage|bonne|chance|félicitations|joyeux|anniversaire|bonne|année|joyeux|noël|bonne|fête)\b/gi,
            threshold: 6
        }
    };
    
    let bestMatch = { lang: 'en', score: 0 };
    
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
        const matches = (cleanText.match(pattern.words) || []).length;
        const score = matches / (cleanText.split(/\s+/).length || 1);
        
        if (matches >= pattern.threshold && score > bestMatch.score) {
            bestMatch = { lang, score };
        }
    }
    
    return bestMatch.lang;
};

// Enhanced genre detection with expanded categories and better keyword matching
const detectGenreFromContent = (bookData) => {
    if (!bookData || typeof bookData !== 'object') return 'Fiction';
    
    let textContent = '';
    
    // Extract text content for analysis
    if (bookData.content) {
        if (typeof bookData.content === 'string') {
            textContent = bookData.content;
        } else if (Array.isArray(bookData.content)) {
            textContent = bookData.content.join(' ');
        } else if (bookData.content.text) {
            textContent = bookData.content.text;
        }
    }
    
    if (!textContent && bookData.chapters) {
        const chapters = Array.isArray(bookData.chapters) ? bookData.chapters : [bookData.chapters];
        textContent = chapters.map(chapter => {
            if (typeof chapter === 'string') return chapter;
            if (chapter.text) return chapter.text;
            if (chapter.content) return typeof chapter.content === 'string' ? chapter.content : '';
            return '';
        }).join(' ');
    }
    
    if (!textContent && bookData.text) {
        textContent = bookData.text;
    }
    
    const content = textContent.toLowerCase();
    
    // Enhanced genre detection with more comprehensive keywords
    const genreKeywords = {
        'Romance': {
            keywords: ['love', 'romance', 'heart', 'relationship', 'dating', 'kiss', 'passion', 'lover', 'boyfriend', 'girlfriend', 'marriage', 'wedding', 'bride', 'groom', 'honeymoon', 'valentine', 'romantic', 'affection', 'intimate', 'desire', 'attraction', 'flirt', 'date', 'couple', 'soulmate', 'crush', 'infatuation'],
            weight: 1.2
        },
        'Mystery': {
            keywords: ['mystery', 'detective', 'murder', 'crime', 'investigation', 'clue', 'suspect', 'evidence', 'police', 'inspector', 'case', 'solve', 'criminal', 'theft', 'robbery', 'kidnapping', 'disappearance', 'witness', 'alibi', 'forensic', 'autopsy', 'interrogation', 'surveillance'],
            weight: 1.3
        },
        'Fantasy': {
            keywords: ['magic', 'wizard', 'dragon', 'fantasy', 'spell', 'kingdom', 'sword', 'quest', 'elf', 'dwarf', 'fairy', 'enchanted', 'mystical', 'realm', 'prophecy', 'sorcerer', 'witch', 'potion', 'magical', 'mythical', 'legendary', 'adventure', 'hero', 'villain', 'darkness', 'light', 'power', 'ancient', 'creature', 'beast'],
            weight: 1.4
        },
        'Science Fiction': {
            keywords: ['space', 'robot', 'future', 'technology', 'alien', 'spacecraft', 'galaxy', 'planet', 'android', 'cyborg', 'artificial intelligence', 'time travel', 'dimension', 'laser', 'quantum', 'cyberpunk', 'dystopian', 'utopian', 'mutation', 'clone', 'genetic', 'virtual reality', 'hologram', 'teleport'],
            weight: 1.3
        },
        'Horror': {
            keywords: ['horror', 'ghost', 'vampire', 'fear', 'nightmare', 'terror', 'scary', 'haunted', 'demon', 'evil', 'dark', 'death', 'blood', 'scream', 'monster', 'zombie', 'werewolf', 'supernatural', 'paranormal', 'curse', 'spirit', 'shadow', 'creepy', 'sinister'],
            weight: 1.2
        },
        'Thriller': {
            keywords: ['thriller', 'suspense', 'tension', 'chase', 'escape', 'danger', 'threat', 'conspiracy', 'assassin', 'spy', 'agent', 'secret', 'betrayal', 'revenge', 'pursuit', 'target', 'mission', 'undercover', 'double agent', 'surveillance', 'intel', 'operation'],
            weight: 1.1
        },
        'Adventure': {
            keywords: ['adventure', 'journey', 'quest', 'treasure', 'expedition', 'exploration', 'travel', 'discovery', 'map', 'island', 'jungle', 'mountain', 'desert', 'ocean', 'survival', 'explorer', 'wilderness', 'rescue', 'escape', 'danger', 'courage', 'brave'],
            weight: 1.0
        },
        'Biography': {
            keywords: ['born', 'life', 'biography', 'childhood', 'career', 'memoir', 'autobiography', 'personal', 'family', 'grew up', 'education', 'achievement', 'struggle', 'success', 'failure', 'experience', 'journey', 'timeline', 'historical figure', 'celebrity', 'politician'],
            weight: 1.5
        },
        'History': {
            keywords: ['history', 'historical', 'war', 'century', 'ancient', 'civilization', 'empire', 'revolution', 'battle', 'king', 'queen', 'emperor', 'dynasty', 'colonial', 'medieval', 'renaissance', 'industrial', 'world war', 'civil war', 'treaty', 'invasion', 'conquest'],
            weight: 1.3
        },
        'Self-Help': {
            keywords: ['self-help', 'improvement', 'success', 'motivation', 'personal development', 'guide', 'tips', 'advice', 'strategy', 'goal', 'achievement', 'confidence', 'leadership', 'productivity', 'mindset', 'habit', 'change', 'growth', 'potential', 'breakthrough'],
            weight: 1.4
        },
        'Education': {
            keywords: ['learn', 'education', 'study', 'knowledge', 'academic', 'university', 'college', 'school', 'student', 'teacher', 'professor', 'course', 'lesson', 'textbook', 'research', 'theory', 'practice', 'exam', 'grade', 'degree', 'curriculum', 'pedagogy'],
            weight: 1.2
        },
        'Business': {
            keywords: ['business', 'entrepreneurship', 'startup', 'company', 'corporation', 'management', 'leadership', 'strategy', 'marketing', 'sales', 'finance', 'investment', 'profit', 'revenue', 'customer', 'market', 'competition', 'brand', 'innovation', 'economy'],
            weight: 1.1
        },
        'Health': {
            keywords: ['health', 'medical', 'medicine', 'doctor', 'patient', 'treatment', 'therapy', 'diagnosis', 'disease', 'illness', 'cure', 'healing', 'wellness', 'fitness', 'nutrition', 'diet', 'exercise', 'mental health', 'psychology', 'pharmaceutical'],
            weight: 1.2
        },
        'Cooking': {
            keywords: ['cooking', 'recipe', 'kitchen', 'chef', 'ingredient', 'dish', 'meal', 'cuisine', 'restaurant', 'food', 'baking', 'grilling', 'preparation', 'flavor', 'taste', 'spice', 'herb', 'cooking technique', 'culinary'],
            weight: 1.3
        },
        'Travel': {
            keywords: ['travel', 'journey', 'vacation', 'destination', 'tourist', 'culture', 'country', 'city', 'guide', 'adventure', 'exploration', 'backpacking', 'sightseeing', 'hotel', 'flight', 'passport', 'customs', 'foreign', 'exotic'],
            weight: 1.1
        },
        'Philosophy': {
            keywords: ['philosophy', 'philosophical', 'ethics', 'moral', 'existence', 'reality', 'consciousness', 'wisdom', 'truth', 'meaning', 'purpose', 'logic', 'reasoning', 'metaphysics', 'epistemology', 'aesthetics', 'virtue', 'justice', 'freedom'],
            weight: 1.4
        },
        'Religion': {
            keywords: ['religion', 'religious', 'faith', 'belief', 'spiritual', 'god', 'divine', 'sacred', 'holy', 'prayer', 'worship', 'church', 'temple', 'mosque', 'synagogue', 'bible', 'quran', 'torah', 'meditation', 'salvation', 'soul', 'afterlife'],
            weight: 1.3
        }
    };
    
    let bestGenre = { name: 'Fiction', score: 0 };
    
    for (const [genre, data] of Object.entries(genreKeywords)) {
        let matches = 0;
        for (const keyword of data.keywords) {
            const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            const keywordMatches = (content.match(regex) || []).length;
            matches += keywordMatches;
        }
        
        const score = (matches * data.weight) / (content.split(/\s+/).length || 1);
        
        if (matches >= 3 && score > bestGenre.score) {
            bestGenre = { name: genre, score };
        }
    }
    
    return bestGenre.name;
};

// Enhanced and robust content analysis
const analyzeBookContent = (bookData) => {
    try {
        console.log('Analyzing book data:', bookData);
        
        if (!bookData || typeof bookData !== 'object') {
            console.warn('Invalid book data for analysis');
            return { 
                description: 'No content available for analysis.', 
                imageUrl: null, 
                chapterCount: 0, 
                avgChapterSize: 0,
                detectedLanguage: 'en'
            };
        }
        
        // Extract image URL from common property names
        let imageUrl = null;
        const imageFields = ['imgurl', 'image_url', 'cover', 'thumbnail', 'imageUrl', 'coverImage', 'coverUrl'];
        
        for (const field of imageFields) {
            if (bookData[field] && typeof bookData[field] === 'string') {
                try {
                    new URL(bookData[field]);
                    imageUrl = bookData[field];
                    break;
                } catch (e) {
                    // Invalid URL, continue to next field
                }
            }
        }
        
        // Check nested objects for image
        if (!imageUrl && bookData.metadata?.image) {
            try {
                new URL(bookData.metadata.image);
                imageUrl = bookData.metadata.image;
            } catch (e) {
                // Invalid URL
            }
        }
        
        // Simplified and more robust text content extraction
        let textContent = '';
        let allTextParts = [];
        
        // Function to recursively extract all text from any structure
        const extractAllText = (obj, depth = 0) => {
            if (depth > 5 || !obj) return; // Prevent infinite recursion
            
            if (typeof obj === 'string' && obj.length > 10) {
                // Only include substantial text
                allTextParts.push(obj.trim());
            } else if (Array.isArray(obj)) {
                obj.forEach(item => extractAllText(item, depth + 1));
            } else if (typeof obj === 'object') {
                // Prioritize common content fields
                const priorityFields = ['content', 'text', 'body', 'description', 'summary', 'chapter', 'paragraph'];
                const otherFields = Object.keys(obj).filter(key => !priorityFields.includes(key.toLowerCase()));
                const allFields = [...priorityFields, ...otherFields];
                
                allFields.forEach(key => {
                    if (obj[key] !== undefined && obj[key] !== null) {
                        extractAllText(obj[key], depth + 1);
                    }
                });
            }
        };
        
        // Extract all text content
        extractAllText(bookData);
        
        // Combine and clean text
        textContent = allTextParts
            .filter(text => text.length > 20) // Filter out short fragments
            .join(' ')
            .replace(/[{}[\]"\\]/g, ' ') // Remove JSON artifacts
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        console.log('Extracted text content length:', textContent.length);
        
        // Extract chapters for analysis
        let chapters = [];
        try {
            if (bookData.chapters) {
                chapters = Array.isArray(bookData.chapters) ? bookData.chapters : [bookData.chapters];
            } else if (bookData.content && bookData.content.chapters) {
                chapters = Array.isArray(bookData.content.chapters) ? bookData.content.chapters : [bookData.content.chapters];
            }
            chapters = chapters.filter(chapter => chapter != null);
        } catch (e) {
            console.warn('Error extracting chapters:', e);
            chapters = [];
        }
        
        // Detect language from content
        let detectedLanguage = 'en';
        if (textContent && textContent.length > 50) {
            try {
                detectedLanguage = detectContentLanguage(textContent);
            } catch (e) {
                console.warn('Language detection failed:', e);
                detectedLanguage = 'en';
            }
        }
        
        if (!textContent || textContent.length < 100) {
            console.warn('Insufficient text content for meaningful analysis');
            return { 
                description: 'This book file contains limited readable text content. The book may be in a format that requires special handling or may contain primarily non-text elements.', 
                imageUrl, 
                chapterCount: chapters.length, 
                avgChapterSize: 0,
                detectedLanguage
            };
        }
        
        // Generate meaningful description from actual content
        let description = '';
        try {
            // Take a substantial excerpt from the beginning for description
            const excerptLength = Math.min(800, textContent.length);
            let excerpt = textContent.substring(0, excerptLength);
            
            // Try to end at a sentence boundary
            const lastSentenceEnd = Math.max(
                excerpt.lastIndexOf('.'),
                excerpt.lastIndexOf('!'),
                excerpt.lastIndexOf('?')
            );
            
            if (lastSentenceEnd > excerptLength * 0.6) {
                excerpt = excerpt.substring(0, lastSentenceEnd + 1);
            } else {
                // If no good sentence boundary, add ellipsis
                excerpt = excerpt.trim() + '...';
            }
            
            // Clean up the excerpt
            excerpt = excerpt
                .replace(/\s+/g, ' ')
                .replace(/^\W+/, '') // Remove leading non-word chars
                .trim();
            
            if (excerpt.length > 50) {
                description = excerpt;
            } else {
                // Fallback: create a summary based on content analysis
                const wordCount = textContent.split(/\s+/).length;
                const genre = detectGenreFromContent(bookData);
                description = `This ${genre.toLowerCase()} book contains ${wordCount} words of content. ` +
                             `The text appears to be in ${detectedLanguage.toUpperCase()} and covers topics related to ${genre.toLowerCase()}.`;
            }
            
            // Add metadata if available
            const wordCount = textContent.split(/\s+/).length;
            const readTime = Math.ceil(wordCount / 200); // Average reading speed
            
            if (wordCount > 100) {
                description += `\n\n📊 Content Stats: ${wordCount.toLocaleString()} words • ~${readTime} min read`;
                
                if (chapters.length > 0) {
                    description += ` • ${chapters.length} chapters`;
                }
            }
            
        } catch (e) {
            console.warn('Error generating description:', e);
            const wordCount = textContent.split(/\s+/).length;
            description = `Content analysis completed. This book contains ${wordCount} words of readable text. Please review and add a custom description if needed.`;
        }
        
        // Calculate chapter statistics
        const chapterCount = chapters.length;
        let avgChapterSize = 0;
        
        if (chapterCount > 0) {
            try {
                const chapterSizes = chapters.map(chapter => {
                    let chapterText = '';
                    if (typeof chapter === 'string') {
                        chapterText = chapter;
                    } else if (chapter && typeof chapter === 'object') {
                        // Extract text from chapter object
                        extractAllText(chapter);
                        chapterText = allTextParts.join(' ');
                        allTextParts = []; // Reset for next chapter
                    }
                    return chapterText.split(/\s+/).length;
                });
                
                avgChapterSize = Math.round(chapterSizes.reduce((sum, size) => sum + size, 0) / chapterCount);
            } catch (e) {
                console.warn('Error calculating chapter statistics:', e);
                avgChapterSize = Math.round(textContent.split(/\s+/).length / chapterCount);
            }
        }
        
        console.log('Analysis complete:', { description: description.substring(0, 100) + '...', imageUrl, chapterCount, avgChapterSize, detectedLanguage });
        
        return { 
            description, 
            imageUrl, 
            chapterCount, 
            avgChapterSize,
            detectedLanguage
        };
        
    } catch (error) {
        console.error('Content analysis error:', error);
        return { 
            description: 'An error occurred during content analysis. The book file may have an unusual structure, but it appears to be valid JSON. You can proceed with manual descriptions.', 
            imageUrl: null, 
            chapterCount: 0, 
            avgChapterSize: 0,
            detectedLanguage: 'en'
        };
    }
};

const translations = {
    en: {
        title: "BookShare Library",
        subtitle: "Digital Book Collection & Sharing Platform",
        uploadTitle: "Upload Your Book",
        uploadSubtitle: "Drag & drop your JSON book file or click to browse",
        searchPlaceholder: "Search books by title, author, or genre...",
        allCategories: "All Categories",
        downloadBtn: "Download",
        deleteBtn: "Delete",
        editBtn: "Edit",
        uploadBtn: "Upload Book",
        analyzing: "Analyzing...",
        uploading: "Uploading...",
        totalBooks: "Total Books",
        totalUsers: "Users",
        totalGenres: "Genres",
        language: "Language",
        author: "Author",
        genre: "Genre",
        description: "Description",
        fileSize: "File Size",
        uploadDate: "Upload Date",
        managementTitle: "Manage Your Books",
        footerText: "Powered by",
        greetings: "Greetings from kosch ",
        welcomeTitle: "Welcome to BookShare Library!",
        welcomeDescription: "Discover and share digital books in JSON format. Upload your book files to share with the community, or browse our collection to find your next great read.",
        proTip: " Pro Tip:",
        proTipDescription: "to read these books online or convert them to editable documents. You can also create new books there and export them to share here!",
        registrationTip: " Registration Info:",
        registrationDescription: "A websim.ai account is not required to upload books, but if you want to edit or remove your books later, please register first. Unregistered user books will stay forever. Register at",
        reviews: "Reviews",
        addReview: "Add Your Review",
        yourRating: "Your Rating",
        yourComment: "Your Comment",
        submitReview: "Submit Review"
    },
    de: {
        title: "BookShare Bibliothek",
        subtitle: "Digitale Buchsammlung & Sharing-Plattform",
        uploadTitle: "Buch hochladen",
        uploadSubtitle: "JSON-Buchdatei hierher ziehen oder klicken zum Durchsuchen",
        searchPlaceholder: "Bücher nach Titel, Autor oder Genre suchen...",
        allCategories: "Alle Kategorien",
        downloadBtn: "Herunterladen",
        deleteBtn: "Löschen",
        editBtn: "Bearbeiten",
        uploadBtn: "Buch hochladen",
        analyzing: "Analysiere...",
        uploading: "Lade hoch...",
        totalBooks: "Bücher insgesamt",
        totalUsers: "Benutzer",
        totalGenres: "Genres",
        language: "Sprache",
        author: "Autor",
        genre: "Genre",
        description: "Beschreibung",
        fileSize: "Dateigröße",
        uploadDate: "Upload-Datum",
        managementTitle: "Ihre Bücher verwalten",
        footerText: "Bereitgestellt von",
        greetings: "Grüße von kosch ",
        welcomeTitle: "Willkommen in der BookShare Bibliothek!",
        welcomeDescription: "Entdecken und teilen Sie digitale Bücher im JSON-Format. Laden Sie Ihre Buchdateien hoch, um sie mit der Community zu teilen, oder durchstöbern Sie unsere Sammlung, um Ihre nächste großartige Lektüre zu finden.",
        proTip: " Pro-Tipp:",
        proTipDescription: "um diese Bücher online zu lesen oder in bearbeitbare Dokumente zu konvertieren. Sie können dort auch neue Bücher erstellen und exportieren, um sie hier zu teilen!",
        registrationTip: " Registrierungs-Info:",
        registrationDescription: "Ein websim.ai-Konto ist nicht erforderlich, um Bücher hochzuladen, aber wenn Sie Ihre Bücher später bearbeiten oder entfernen möchten, registrieren Sie sich bitte zuerst. Bücher nicht registrierter Benutzer bleiben für immer bestehen. Registrieren Sie sich unter",
        reviews: "Bewertungen",
        addReview: "Ihre Bewertung abgeben",
        yourRating: "Ihre Bewertung",
        yourComment: "Ihr Kommentar",
        submitReview: "Bewertung absenden"
    }
};

const commonGenres = [
    'Fiction', 'Non-Fiction', 'Romance', 'Mystery', 'Fantasy', 'Science Fiction', 'Horror', 'Adventure',
    'Biography', 'Autobiography', 'Memoir', 'History', 'Self-Help', 'Education', 'Textbook', 'Reference',
    'Drama', 'Comedy', 'Thriller', 'Suspense', 'Crime', 'Detective', 'Poetry', 'Philosophy', 'Religion',
    'Spirituality', 'Travel', 'Cooking', 'Art', 'Music', 'Sports', 'Business', 'Technology', 'Health',
    'Medical', 'Science', 'Nature', 'Politics', 'Law', 'Economics', 'Psychology', 'Sociology', 'Anthropology',
    'Children', 'Young Adult', 'Teen', 'Adult', 'Classic', 'Contemporary', 'Historical Fiction',
    'Romantic Comedy', 'Paranormal Romance', 'Urban Fantasy', 'Epic Fantasy', 'Space Opera', 'Dystopian',
    'Post-Apocalyptic', 'Alternate History', 'Time Travel', 'Military', 'War', 'Western', 'Gothic',
    'Steampunk', 'Cyberpunk', 'Literary Fiction', 'Experimental', 'Magical Realism', 'Satire', 'Humor',
    'Essays', 'Journalism', 'True Crime', 'How-To', 'Guide', 'Manual', 'Encyclopedia', 'Dictionary',
    'Atlas', 'Almanac', 'Academic', 'Research', 'Thesis', 'Technical', 'Professional', 'Craft',
    'Hobby', 'Games', 'Entertainment', 'Lifestyle', 'Fashion', 'Beauty', 'Fitness', 'Diet',
    'Nutrition', 'Wellness', 'Mental Health', 'Relationships', 'Parenting', 'Family', 'Home',
    'Garden', 'DIY', 'Repair', 'Architecture', 'Design', 'Photography', 'Film', 'Television',
    'Theater', 'Dance', 'Opera', 'Classical Music', 'Jazz', 'Rock', 'Pop', 'Folk', 'World Music',
    'Instruments', 'Theory', 'Composition', 'Painting', 'Sculpture', 'Drawing', 'Crafts', 'Antiques',
    'Collectibles', 'Archaeology', 'Astronomy', 'Biology', 'Chemistry', 'Physics', 'Mathematics',
    'Engineering', 'Computer Science', 'Programming', 'Internet', 'Social Media', 'Communication',
    'Language', 'Linguistics', 'Translation', 'Writing', 'Publishing', 'Library Science', 'Information',
    'Media Studies', 'Journalism', 'Broadcasting', 'Public Relations', 'Marketing', 'Advertising',
    'Sales', 'Management', 'Leadership', 'Entrepreneurship', 'Finance', 'Investment', 'Banking',
    'Insurance', 'Real Estate', 'Accounting', 'Taxation', 'Legal', 'Ethics', 'Human Rights',
    'Social Justice', 'Environmental', 'Ecology', 'Climate', 'Energy', 'Sustainability', 'Agriculture',
    'Veterinary', 'Zoology', 'Botany', 'Geology', 'Geography', 'Cartography', 'Meteorology',
    'Oceanography', 'Space Science', 'Archaeology', 'Paleontology', 'Genetics', 'Medicine',
    'Nursing', 'Pharmacy', 'Dentistry', 'Therapy', 'Alternative Medicine', 'Homeopathy', 'Herbs',
    'Meditation', 'Yoga', 'Martial Arts', 'Sports Training', 'Coaching', 'Olympics', 'Recreation',
    'Outdoor Activities', 'Camping', 'Hiking', 'Climbing', 'Fishing', 'Hunting', 'Sailing',
    'Aviation', 'Automotive', 'Motorcycles', 'Transportation', 'Logistics', 'Supply Chain',
    'Manufacturing', 'Quality Control', 'Safety', 'Emergency', 'First Aid', 'Security', 'Military Science',
    'Strategy', 'Tactics', 'Intelligence', 'Espionage', 'Diplomacy', 'International Relations',
    'Cultural Studies', 'Ethnic Studies', 'Gender Studies', 'LGBTQ', 'Disability Studies',
    'Senior Living', 'Retirement', 'Estate Planning', 'Financial Planning', 'Career Development',
    'Job Search', 'Resume Writing', 'Interview Skills', 'Networking', 'Professional Development',
    'Time Management', 'Productivity', 'Organization', 'Stress Management', 'Motivation', 'Success',
    'Personal Growth', 'Life Skills', 'Communication Skills', 'Social Skills', 'Emotional Intelligence',
    'Mindfulness', 'Happiness', 'Confidence', 'Self-Esteem', 'Creativity', 'Innovation', 'Problem Solving',
    'Critical Thinking', 'Decision Making', 'Goal Setting', 'Habit Formation', 'Change Management'
];

const StarRating = ({ rating, onRatingChange, size = 'md' }) => {
    const [hoverRating, setHoverRating] = useState(0);

    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl'
    };

    return (
        <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => {
                const effectiveRating = hoverRating || rating;
                let iconClass = "far fa-star";
                if (effectiveRating >= star) {
                    iconClass = "fas fa-star";
                } else if (effectiveRating >= star - 0.5) {
                    iconClass = "fas fa-star-half-alt";
                }

                return (
                    <i
                        key={star}
                        className={`${iconClass} text-yellow-400 ${onRatingChange ? 'cursor-pointer' : ''} ${sizeClasses[size]}`}
                        onClick={() => onRatingChange && onRatingChange(star)}
                        onMouseEnter={() => onRatingChange && setHoverRating(star)}
                        onMouseLeave={() => onRatingChange && setHoverRating(0)}
                    />
                );
            })}
        </div>
    );
};

const BookShareApp = () => {
    const [currentLanguage, setCurrentLanguage] = useState(detectLanguage().split('-')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedCategories, setSelectedCategories] = useState(['all']);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('all');
    const [sortBy, setSortBy] = useState('upload_date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showUpload, setShowUpload] = useState(false);
    const [showManagement, setShowManagement] = useState(false);
    const [showBookDetail, setShowBookDetail] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [notification, setNotification] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [editingBook, setEditingBook] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [currentSlide, setCurrentSlide] = useState(0);
    const [welcomeCollapsed, setWelcomeCollapsed] = useState(() => {
        const saved = localStorage.getItem('welcomeCollapsed');
        return saved !== null ? JSON.parse(saved) : false;
    });
    const [uploadForm, setUploadForm] = useState({
        title: '',
        author: '',
        genre: '',
        language: 'auto',
        description: ''
    });
    const [fileToUpload, setFileToUpload] = useState(null);
    const [analyzedContent, setAnalyzedContent] = useState(null);
    const [managementTab, setManagementTab] = useState('myBooks');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [showLogin, setShowLogin] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [expandedDescriptions, setExpandedDescriptions] = useState({});
    const [filtersCollapsed, setFiltersCollapsed] = useState(true);

    const fileInputRef = useRef(null);

    const handleFileUpload = async (file) => {
        console.log('Starting file upload process:', file.name);
        
        if (!file) {
            showNotification('No file selected.', 'error');
            return;
        }
        
        if (!file.name.toLowerCase().endsWith('.json')) {
            showNotification('Please upload a valid JSON file.', 'error');
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            showNotification('File too large. Please upload files smaller than 50MB.', 'error');
            return;
        }
        
        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatus('analyzing');
        
        try {
            console.log('Reading file...');
            setUploadProgress(20);
            
            // Use Promise-based file reading for better error handling
            const fileContent = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.onerror = (error) => reject(new Error('Failed to read file: ' + error.message));
                reader.readAsText(file);
            });
            
            console.log('File read successfully, parsing JSON...');
            setUploadProgress(40);
            
            let bookData;
            try {
                bookData = JSON.parse(fileContent);
                console.log('JSON parsed successfully');
                setUploadProgress(60);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Invalid JSON format. Please check your file and try again.');
            }
            
            // Validate that bookData is an object
            if (!bookData || typeof bookData !== 'object') {
                console.error('Invalid book data structure');
                throw new Error('Invalid book format. The JSON file must contain a valid book object.');
            }
            
            console.log('Analyzing content...');
            setUploadProgress(80);
            
            // Enhanced genre detection with better fallbacks
            let genre = bookData.genre || 
                       bookData.category || 
                       bookData.type ||
                       bookData.metadata?.genre ||
                       bookData.info?.genre ||
                       bookData.subject ||
                       'Fiction';
            
            if (!genre || genre === 'Uncategorized' || genre === 'Book') {
                try {
                    genre = detectGenreFromContent(bookData);
                } catch (e) {
                    console.warn('Genre detection failed:', e);
                    genre = 'Fiction';
                }
            }
            
            // Ensure genre is in our supported list
            if (!commonGenres.includes(genre)) {
                genre = 'Fiction'; // Default fallback
            }
            
            // Enhanced language detection with better fallbacks
            let language = bookData.language || 
                          bookData.lang || 
                          bookData.metadata?.language ||
                          bookData.info?.language ||
                          bookData.locale ||
                          'auto';
            
            setUploadProgress(90);
            
            // Analyze content with comprehensive error handling
            let analysis;
            try {
                analysis = analyzeBookContent(bookData);
            } catch (analysisError) {
                console.warn('Content analysis failed, using defaults:', analysisError);
                analysis = { 
                    description: 'Content analysis unavailable for this file format. Please add a description manually.', 
                    imageUrl: null, 
                    chapterCount: 0, 
                    avgChapterSize: 0,
                    detectedLanguage: 'en'
                };
            }
            
            setUploadProgress(100);
            
            // Extract title from various possible locations with better fallbacks
            let title = '';
            const titleFields = ['title', 'name', 'book_title', 'bookTitle'];
            for (const field of titleFields) {
                if (bookData[field] && typeof bookData[field] === 'string' && bookData[field].trim()) {
                    title = bookData[field].trim();
                    break;
                }
            }
            
            // Check nested objects for title
            if (!title && bookData.metadata?.title) title = String(bookData.metadata.title).trim();
            if (!title && bookData.info?.title) title = String(bookData.info.title).trim();
            if (!title && bookData.book?.title) title = String(bookData.book.title).trim();
            
            // Fallback to filename
            if (!title) {
                title = file.name.replace('.json', '').replace(/[-_]/g, ' ');
                title = title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            }
            
            // Extract author from various possible locations
            let author = '';
            const authorFields = ['author', 'creator', 'writer', 'by'];
            for (const field of authorFields) {
                if (bookData[field] && typeof bookData[field] === 'string' && bookData[field].trim()) {
                    author = bookData[field].trim();
                    break;
                }
            }
            
            // Check nested objects for author
            if (!author && bookData.metadata?.author) author = String(bookData.metadata.author).trim();
            if (!author && bookData.info?.author) author = String(bookData.info.author).trim();
            if (!author && bookData.book?.author) author = String(bookData.book.author).trim();
            
            // Fallback to Unknown Author
            if (!author) author = 'Unknown Author';
            
            // Update form with detected values
            setUploadForm({
                title: title || "Untitled Book",
                author: author || "Unknown Author",
                genre: genre,
                language: language === 'auto' ? analysis.detectedLanguage : language,
                description: ''
            });
            
            setFileToUpload(file);
            setAnalyzedContent({ ...analysis, bookData });
            setUploadStatus('complete');
            setIsUploading(false);
            
            console.log('File analysis complete');
            showNotification('File analyzed successfully! You can now review and upload.', 'success');
            
        } catch (error) {
            console.error('File processing error:', error);
            setIsUploading(false);
            setUploadStatus('error');
            setUploadProgress(0);
            showNotification(error.message || 'Failed to analyze book file. Please check the file format.', 'error');
            setFileToUpload(null);
            setAnalyzedContent(null);
        }
    };

    const cancelUpload = () => {
        setFileToUpload(null);
        setAnalyzedContent(null);
        setUploadForm({
            title: '',
            author: '',
            genre: '',
            language: 'auto',
            description: ''
        });
        setUploadProgress(0);
        setUploadStatus('');
        setIsUploading(false);
    };

    const confirmUpload = async () => {
        if (!fileToUpload || !analyzedContent) {
            showNotification('No file ready for upload.', 'error');
            return;
        }

        if (!currentUser) {
            showNotification('Please log in to upload books.', 'error');
            setShowLogin(true);
            return;
        }

        setIsUploading(true);
        setUploadStatus('uploading');
        setUploadProgress(0);

        try {
            setUploadProgress(25);
            
            const finalDescription = uploadForm.description.trim() || analyzedContent.description;
            const finalLanguage = uploadForm.language === 'auto' ? analyzedContent.detectedLanguage : uploadForm.language;

            setUploadProgress(50);

            // Simplified upload data structure
            const uploadData = {
                title: uploadForm.title.trim() || "Untitled Book",
                author: uploadForm.author.trim() || "Unknown Author",
                genre: uploadForm.genre || 'Fiction',
                language: finalLanguage || 'en',
                description: finalDescription || 'No description available.',
                image_url: analyzedContent.imageUrl || null,
                file_data: analyzedContent.bookData,
                original_filename: fileToUpload.name,
                file_size: fileToUpload.size,
                upload_date: new Date().toISOString(),
                chapter_count: analyzedContent.chapterCount || 0,
                avg_chapter_size: analyzedContent.avgChapterSize || 0,
                download_count: 0,
                user_id: currentUser.id,
                username: currentUser.username,
                avg_rating: 0,
                review_count: 0
            };

            console.log('Uploading book data:', uploadData);

            setUploadProgress(75);

            const result = await room.collection('books').upsert(uploadData);
            
            console.log('Upload successful:', result);

            setUploadProgress(100);
            setUploadStatus('complete');
            
            showNotification('Book uploaded successfully!', 'success');
            
            // Reset form and close modal
            setTimeout(() => {
                setShowUpload(false);
                cancelUpload();
            }, 1500);

        } catch (error) {
            console.error('Upload error details:', error);
            setUploadStatus('error');
            setUploadProgress(0);
            setIsUploading(false);
            
            // More specific error messages
            let errorMessage = 'Failed to upload book. ';
            if (error.message) {
                errorMessage += error.message;
            } else if (error.code) {
                errorMessage += `Error code: ${error.code}`;
            } else {
                errorMessage += 'Please check your connection and try again.';
            }
            
            showNotification(errorMessage, 'error');
        }
    };

    const { data: books, loading: booksLoading } = useQuery(room.collection('books'));
    const { data: userBooks } = useQuery(room.collection('books').filter({ user_id: currentUser?.id }));
    const { data: savedBooks } = useQuery(room.collection('saved_books').filter({ user_id: currentUser?.id }));
    const { data: reviews, loading: reviewsLoading } = useQuery(room.collection('book_reviews').filter({ book_id: selectedBook?.id }), [selectedBook]);

    const t = translations[currentLanguage] || translations.en;

    useEffect(() => {
        localStorage.setItem('welcomeCollapsed', JSON.stringify(welcomeCollapsed));
    }, [welcomeCollapsed]);

    useEffect(() => {
        initializeApp();
        
        // Check for book referral link with improved handling
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = urlParams.get('book');
        if (bookId) {
            if (books && books.length > 0) {
                const book = books.find(b => b.id === bookId);
                if (book) {
                    setSelectedBook(book);
                    setShowBookDetail(true);
                } else {
                    // Book not found, clear URL parameter
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, '', newUrl);
                    showNotification('Book not found or may have been removed.', 'error');
                }
            }
            // If books haven't loaded yet, the effect will run again when they do
        }
    }, [books]);

    const initializeApp = async () => {
        try {
            const user = await window.websim.getCurrentUser();
            setCurrentUser(user);

            // Set user language preference
            const detectedLang = detectLanguage().split('-')[0];
            setCurrentLanguage(['en', 'de'].includes(detectedLang) ? detectedLang : 'en');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            setCurrentUser(null);
        }
    };

    const handleLogin = async () => {
        setIsLoggingIn(true);
        try {
            // Redirect to websim login
            window.location.href = 'https://websim.ai/login?redirect=' + encodeURIComponent(window.location.href);
        } catch (error) {
            console.error('Login failed:', error);
            showNotification('Login failed. Please try again.', 'error');
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => {
        try {
            // Clear current user
            setCurrentUser(null);
            showNotification('Logged out successfully!');
            
            // Redirect to websim logout
            window.location.href = 'https://websim.ai/logout?redirect=' + encodeURIComponent(window.location.href);
        } catch (error) {
            console.error('Logout failed:', error);
            showNotification('Logout failed. Please try again.', 'error');
        }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const shareBook = (book) => {
        const shareUrl = `${window.baseUrl || window.location.origin + window.location.pathname}?book=${book.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification(`Link for "${book.title}" copied to clipboard!`);
        }).catch(() => {
            showNotification('Failed to copy link to clipboard.', 'error');
        });
    };

    const openBookDetail = (book) => {
        setSelectedBook(book);
        setShowBookDetail(true);
        
        // Update URL without reload using baseUrl for better compatibility
        const newUrl = `${window.location.pathname}?book=${book.id}`;
        window.history.pushState({ bookId: book.id }, `${book.title} - BookShare Library`, newUrl);
    };

    const closeBookDetail = () => {
        setShowBookDetail(false);
        setSelectedBook(null);
        
        // Remove book parameter from URL
        const newUrl = window.location.pathname;
        window.history.pushState({}, 'BookShare Library', newUrl);
    };

    const startEditBook = (book) => {
        setEditingBook(book.id);
        setEditForm({
            title: book.title,
            author: book.author,
            genre: book.genre,
            language: book.language,
            description: book.description
        });
    };

    const saveBookEdit = async (bookId) => {
        try {
            await room.collection('books').upsert({
                id: bookId,
                ...editForm
            });
            setEditingBook(null);
            setEditForm({});
            showNotification('Book updated successfully!');
        } catch (error) {
            showNotification('Failed to update book.', 'error');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const downloadBook = (book) => {
        try {
            const dataStr = JSON.stringify(book.file_data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = book.original_filename || `${book.title}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            // Update download count
            updateDownloadCount(book.id);
            
            showNotification(`"${book.title}" downloaded successfully!`);
        } catch (error) {
            showNotification('Failed to download book.', 'error');
        }
    };

    const updateDownloadCount = async (bookId) => {
        try {
            const book = books.find(b => b.id === bookId);
            if (book) {
                await room.collection('books').upsert({
                    id: bookId,
                    download_count: (book.download_count || 0) + 1
                });
            }
        } catch (error) {
            console.error('Failed to update download count:', error);
        }
    };

    const saveToMyBooks = async (book) => {
        if (!currentUser) {
            showNotification('Please log in to save books.', 'error');
            return;
        }

        try {
            const existingSave = savedBooks?.find(save => save.book_id === book.id);
            
            if (existingSave) {
                // Unsave book
                await room.collection('saved_books').delete(existingSave.id);
                showNotification(`"${book.title}" removed from saved books.`);
            } else {
                // Save book
                await room.collection('saved_books').upsert({
                    book_id: book.id,
                    user_id: currentUser.id
                });
                showNotification(`"${book.title}" saved to your collection!`);
            }
        } catch (error) {
            showNotification('Failed to save book.', 'error');
        }
    };

    const isBookSaved = (bookId) => {
        return savedBooks?.some(save => save.book_id === bookId) || false;
    };

    const deleteBook = async (bookId) => {
        if (!currentUser) {
            showNotification('Please log in to delete books.', 'error');
            return;
        }

        // Find the book to verify ownership
        const book = books.find(b => b.id === bookId);
        if (!book) {
            showNotification('Book not found.', 'error');
            return;
        }

        // Check ownership
        if (book.user_id !== currentUser.id) {
            showNotification('You can only delete your own books.', 'error');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete "${book.title}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            console.log('Attempting to delete book:', bookId, 'by user:', currentUser.id);
            await room.collection('books').delete(bookId);
            showNotification('Book deleted successfully!');
            
            // Close any open modals showing this book
            if (selectedBook && selectedBook.id === bookId) {
                closeBookDetail();
            }
        } catch (error) {
            console.error('Delete error:', error);
            showNotification(`Failed to delete book: ${error.message || 'Unknown error'}`, 'error');
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(currentLanguage);
    };

    // Get unique genres for filter
    const languages = books ? [...new Set(books.map(book => book.language))] : [];
    
    const uniqueUsers = books ? [...new Set(books.map(book => book.username))] : [];
    
    const allGenres = [...new Set([...commonGenres, ...books?.map(book => book.genre)])].sort();
    
    // Featured book collections for slider
    const getMostLikedBooks = () => {
        if (!books) return [];
        // Since we don't have likes data yet, use download_count as proxy
        return [...books]
            .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
            .slice(0, 3);
    };
    
    const getMostDownloadedBooks = () => {
        if (!books) return [];
        return [...books]
            .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
            .slice(0, 3);
    };
    
    const getNewestBooks = () => {
        if (!books) return [];
        return [...books]
            .sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date))
            .slice(0, 3);
    };
    
    const sliderData = [
        { 
            title: currentLanguage === 'de' ? 'Beliebteste Bücher' : 'Most Popular Books', 
            books: getMostLikedBooks(), 
            icon: 'fa-heart' 
        },
        { 
            title: currentLanguage === 'de' ? 'Meistgeladene Bücher' : 'Most Downloaded Books', 
            books: getMostDownloadedBooks(), 
            icon: 'fa-download' 
        },
        { 
            title: currentLanguage === 'de' ? 'Neueste Bücher' : 'Newest Books', 
            books: getNewestBooks(), 
            icon: 'fa-clock' 
        }
    ];
    
    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % sliderData.length);
    };
    
    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + sliderData.length) % sliderData.length);
    };
    
    const goToSlide = (index) => {
        setCurrentSlide(index);
    };
    
    // Auto-advance slider
    useEffect(() => {
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, []);
    
    // Statistics
    const stats = {
        totalBooks: books ? books.length : 0,
        totalUsers: uniqueUsers.length,
        totalGenres: books ? [...new Set(books.map(book => book.genre))].length : 0,
        totalDownloads: books ? books.reduce((sum, book) => sum + (book.download_count || 0), 0) : 0
    };
    
    const toggleDescription = (bookId) => {
        setExpandedDescriptions(prev => ({
            ...prev,
            [bookId]: !prev[bookId]
        }));
    };

    const handleReviewSubmit = async (bookId, rating, comment) => {
        if (!currentUser) {
            showNotification('Please log in to submit a review.', 'error');
            setShowLogin(true);
            return;
        }
        if (rating === 0) {
            showNotification('Please select a rating.', 'error');
            return;
        }

        try {
            // Add the new review
            await room.collection('book_reviews').upsert({
                book_id: bookId,
                user_id: currentUser.id,
                username: currentUser.username,
                rating: rating,
                comment: comment,
                created_at: new Date().toISOString()
            });

            // Recalculate and update book's average rating and review count
            const allReviewsForBook = await room.collection('book_reviews').query({ book_id: bookId });
            const totalRating = allReviewsForBook.reduce((sum, review) => sum + review.rating, 0);
            const reviewCount = allReviewsForBook.length;
            const avgRating = reviewCount > 0 ? totalRating / reviewCount : 0;

            await room.collection('books').upsert({
                id: bookId,
                avg_rating: avgRating,
                review_count: reviewCount
            });
            
            showNotification('Review submitted successfully!', 'success');
        } catch (error) {
            console.error('Failed to submit review:', error);
            showNotification('Failed to submit review.', 'error');
        }
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="glass-container mx-auto mt-8 mb-12 p-6 md:p-8 max-w-6xl">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex-1">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{t.title}</h1>
                        <p className="text-lg md:text-xl text-white/80">{t.subtitle}</p>
                    </div>
                    
                    {/* User Authentication Section */}
                    <div className="flex items-center gap-4">
                        {currentUser ? (
                            <div className="flex items-center gap-3 bg-white/10 rounded-full p-2 pr-4 transition-colors hover:bg-white/20">
                                <img 
                                    src={`https://images.websim.com/avatar/${currentUser.username}`}
                                    alt={currentUser.username}
                                    className="w-10 h-10 rounded-full border-2 border-white/30"
                                />
                                <div className="text-left">
                                    <p className="text-white font-semibold text-sm">@{currentUser.username}</p>
                                    <button 
                                        onClick={handleLogout}
                                        className="text-white/70 hover:text-white text-xs underline"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setShowLogin(true)}
                                className="btn-secondary text-white bg-white/10 border-white/30 hover:bg-white/20"
                            >
                                <i className="fas fa-sign-in-alt mr-2"></i>
                                Login
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Welcome Section */}
                <div className="bg-black/10 backdrop-blur-sm rounded-xl text-white transition-all duration-500 ease-in-out overflow-hidden">
                    <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10"
                        onClick={() => setWelcomeCollapsed(!welcomeCollapsed)}
                    >
                        <div className="flex items-center gap-3">
                             <i className={`fas fa-info-circle text-blue-300 text-2xl transition-transform duration-300 ${!welcomeCollapsed && "rotate-180"}`}></i>
                            <h3 className="text-lg font-semibold">{t.welcomeTitle}</h3>
                        </div>
                        <button className="text-white/80 hover:text-white">
                             <i className={`fas fa-chevron-down text-xl transition-transform duration-300 ${!welcomeCollapsed && "rotate-180"}`}></i>
                        </button>
                    </div>
                    <div className={`transition-max-height duration-700 ease-in-out overflow-hidden ${welcomeCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
                        <div className="p-6 pt-2 border-t border-white/20">
                            <p className="text-white/90 mb-4 leading-relaxed">
                                {t.welcomeDescription}
                            </p>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-blue-500/20 border border-blue-300/30 rounded-lg p-4">
                                    <div className="flex items-start gap-3 mb-2">
                                        <i className="fas fa-lightbulb text-yellow-300 text-2xl mt-1"></i>
                                        <div className="text-left">
                                            <p className="font-semibold text-blue-100 mb-1">{t.proTip}</p>
                                            <p className="text-white/90 text-sm leading-relaxed">
                                                {t.proTipDescription}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-purple-500/20 border border-purple-300/30 rounded-lg p-4">
                                    <div className="flex items-start gap-3 mb-2">
                                        <i className="fas fa-user-plus text-purple-300 text-2xl mt-1"></i>
                                        <div className="text-left">
                                            <p className="font-semibold text-purple-100 mb-1">{t.registrationTip}</p>
                                            <p className="text-white/90 text-sm leading-relaxed">
                                                {t.registrationDescription}{' '}
                                                <a href="https://websim.com/@USK/login-and-registration-form" target="_blank" rel="noopener noreferrer" 
                                                className="text-purple-300 hover:text-purple-100 text-sm underline font-semibold">
                                                websim.com</a>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-center gap-4 flex-wrap mt-8">
                    <button 
                        onClick={() => currentUser ? setShowUpload(true) : setShowLogin(true)}
                        className="btn-primary"
                    >
                        <i className="fas fa-upload mr-2"></i>
                        {t.uploadBtn}
                    </button>
                    
                    {currentUser && (
                        <button 
                            onClick={() => setShowManagement(true)}
                            className="btn-secondary"
                        >
                            <i className="fas fa-cog mr-2"></i>
                            {t.managementTitle}
                        </button>
                    )}
                    
                    <select 
                        value={currentLanguage} 
                        onChange={(e) => setCurrentLanguage(e.target.value)}
                        className="btn-secondary"
                    >
                        <option value="en">English</option>
                        <option value="de">Deutsch</option>
                    </select>
                </div>
            </header>
            
            {/* Statistics */}
            <div className="max-w-6xl mx-auto px-4">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-number">{stats.totalBooks}</div>
                        <div className="stat-label">{t.totalBooks}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{stats.totalUsers}</div>
                        <div className="stat-label">{t.totalUsers}</div>
                        {uniqueUsers.length > 0 && (
                            <div className="flex justify-center gap-1 mt-2 flex-wrap">
                                {uniqueUsers.slice(0, 8).map(username => (
                                    <img 
                                        key={username}
                                        src={`https://images.websim.com/avatar/${username}`}
                                        alt={username}
                                        className="w-6 h-6 rounded-full border-2 border-white/30"
                                        title={`@${username}`}
                                    />
                                ))}
                                {uniqueUsers.length > 8 && (
                                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs text-white font-semibold">
                                        +{uniqueUsers.length - 8}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{stats.totalGenres}</div>
                        <div className="stat-label">{t.totalGenres}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{stats.totalDownloads}</div>
                        <div className="stat-label">{currentLanguage === 'de' ? 'Downloads' : 'Downloads'}</div>
                    </div>
                </div>
            </div>
            
            {/* Featured Books Slider */}
            <div className="max-w-6xl mx-auto px-4 mb-8">
                <div className="glass-container p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <i className={`fas ${sliderData[currentSlide].icon} text-2xl text-white`}></i>
                            <h2 className="text-2xl font-bold text-white">{sliderData[currentSlide].title}</h2>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={prevSlide}
                                className="slider-nav-btn"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            <button 
                                onClick={nextSlide}
                                className="slider-nav-btn"
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div className="slider-container">
                        <div className="slider-track" style={{transform: `translateX(-${currentSlide * 100}%)`}}>
                            {sliderData.map((slide, slideIndex) => (
                                <div key={slideIndex} className="slider-slide">
                                    {slide.books.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {slide.books.map((book) => (
                                                <div key={book.id} className="featured-book-card">
                                                    {book.image_url && (
                                                        <div className="mb-3">
                                                            <img 
                                                                src={book.image_url} 
                                                                alt={book.title}
                                                                className="w-full h-32 object-cover rounded-lg"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                    <h3 className="font-bold text-lg mb-1 line-clamp-2">{book.title}</h3>
                                                    <p className="text-white/80 text-sm mb-2">by {book.author}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="language-badge text-xs">{book.language}</span>
                                                        <span className="px-2 py-1 bg-white/20 rounded text-xs text-white">
                                                            {book.genre}
                                                        </span>
                                                        {book.chapter_count > 0 && (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                                                {book.chapter_count} chapters
                                                            </span>
                                                        )}
                                                        {book.avg_chapter_size > 0 && (
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                                                ~{book.avg_chapter_size} words/chapter
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openBookDetail(book)}
                                                            className="btn-featured flex-1"
                                                        >
                                                            <i className="fas fa-eye mr-2"></i>
                                                            View Details
                                                        </button>
                                                        <button
                                                            onClick={() => downloadBook(book)}
                                                            className="btn-featured-secondary"
                                                        >
                                                            <i className="fas fa-download"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-white/70 py-8">
                                            <i className="fas fa-book-open text-4xl mb-3 opacity-50"></i>
                                            <p>No books available in this category yet.</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Slider indicators */}
                    <div className="flex justify-center gap-2 mt-6">
                        {sliderData.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`slider-indicator ${currentSlide === index ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Search and Filter */}
            <div className="max-w-6xl mx-auto px-4 mb-8">
                <div className="glass-container p-6">
                     <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setFiltersCollapsed(!filtersCollapsed)}
                    >
                        <h2 className="text-2xl font-bold text-white">Filter & Sort</h2>
                        <button className="text-white/80 hover:text-white">
                             <i className={`fas fa-chevron-down text-xl transition-transform duration-300 ${!filtersCollapsed && "rotate-180"}`}></i>
                        </button>
                    </div>

                    <div className={`transition-max-height duration-500 ease-in-out overflow-hidden ${filtersCollapsed ? 'max-h-0' : 'max-h-[500px]'}`}>
                        <div className="pt-6">
                            <input
                                type="text"
                                placeholder={t.searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-bar mb-4"
                            />
                            
                            {/* Sorting Controls */}
                            <div className="flex flex-wrap gap-4 mb-4">
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="btn-secondary"
                                >
                                    <option value="upload_date">Sort by Upload Date</option>
                                    <option value="title">Sort by Title</option>
                                    <option value="author">Sort by Author</option>
                                    <option value="genre">Sort by Genre</option>
                                    <option value="file_size">Sort by File Size</option>
                                    <option value="download_count">Sort by Downloads</option>
                                    <option value="avg_rating">Sort by Rating</option>
                                </select>
                                
                                <select 
                                    value={selectedLanguage} 
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="btn-secondary"
                                >
                                    <option value="all">All Languages</option>
                                    {languages.map(language => (
                                        <option key={language} value={language}>
                                            {language.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                                
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                                    className="btn-secondary"
                                >
                                    <i className={`fas fa-sort-${sortOrder === 'desc' ? 'down' : 'up'} mr-2`}></i>
                                    {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                                </button>
                            </div>
                            
                            <div className="category-filter-container">
                                <button 
                                    className="category-dropdown-toggle btn-secondary flex items-center gap-2"
                                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                >
                                    <i className="fas fa-filter"></i>
                                    {selectedCategories.includes('all') || selectedCategories.length === 0
                                        ? t.allCategories 
                                        : `${selectedCategories.length} Categories Selected`
                                    }
                                    <i className={`fas fa-chevron-${showCategoryDropdown ? 'up' : 'down'} ml-auto`}></i>
                                </button>
                                
                                {showCategoryDropdown && (
                                    <div className="multiselect-dropdown">
                                        <div className="multiselect-option" onClick={() => {
                                            if (selectedCategories.includes('all')) {
                                                setSelectedCategories([]);
                                            } else {
                                                setSelectedCategories(['all']);
                                            }
                                        }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedCategories.includes('all') || selectedCategories.length === 0} 
                                                readOnly 
                                                className="mr-2" 
                                            />
                                            {t.allCategories}
                                        </div>
                                        {allGenres.map(genre => (
                                            <div 
                                                key={genre} 
                                                className={`multiselect-option ${selectedCategories.includes(genre) ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedCategories(prev => {
                                                        const newSelection = prev.filter(c => c !== 'all');
                                                        if (newSelection.includes(genre)) {
                                                            return newSelection.filter(c => c !== genre);
                                                        } else {
                                                            return [...newSelection, genre];
                                                        }
                                                    });
                                                }}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedCategories.includes(genre)} 
                                                    readOnly 
                                                    className="mr-2" 
                                                />
                                                {genre}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Books Grid */}
            <div className="max-w-6xl mx-auto px-4 mb-12">
                {booksLoading ? (
                    <div className="text-center text-white">
                        <div className="loading-spinner mx-auto mb-4"></div>
                        <p>Loading books...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {books.filter(book => {
                            const matchesSearch = !searchTerm || 
                                book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                book.genre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                book.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                book.username.toLowerCase().includes(searchTerm.toLowerCase());
                            
                            const matchesCategory = selectedCategories.includes('all') || 
                                selectedCategories.includes(book.genre);
                            
                            const matchesLanguage = selectedLanguage === 'all' || 
                                book.language === selectedLanguage;
                            
                            return matchesSearch && matchesCategory && matchesLanguage;
                        })
                        .sort((a, b) => {
                            let aValue, bValue;
                            
                            switch (sortBy) {
                                case 'title':
                                    aValue = a.title.toLowerCase();
                                    bValue = b.title.toLowerCase();
                                    break;
                                case 'author':
                                    aValue = a.author.toLowerCase();
                                    bValue = b.author.toLowerCase();
                                    break;
                                case 'genre':
                                    aValue = a.genre.toLowerCase();
                                    bValue = b.genre.toLowerCase();
                                    break;
                                case 'file_size':
                                    aValue = a.file_size;
                                    bValue = b.file_size;
                                    break;
                                case 'download_count':
                                    aValue = a.download_count || 0;
                                    bValue = b.download_count || 0;
                                    break;
                                case 'avg_rating':
                                    aValue = a.avg_rating || 0;
                                    bValue = b.avg_rating || 0;
                                    break;
                                case 'upload_date':
                                default:
                                    aValue = new Date(a.upload_date);
                                    bValue = new Date(b.upload_date);
                                    break;
                            }
                            
                            if (sortOrder === 'desc') {
                                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            } else {
                                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            }
                        }).map(book => (
                            <div key={book.id} className="book-card">
                                {book.image_url && (
                                    <div className="mb-4">
                                        <img 
                                            src={book.image_url} 
                                            alt={book.title}
                                            className="w-full h-48 object-cover rounded-lg"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-xl mb-1 line-clamp-2">{book.title}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                            <img 
                                                src={`https://images.websim.com/avatar/${book.username}`}
                                                alt={book.username}
                                                className="w-5 h-5 rounded-full"
                                            />
                                            <span>by {book.author}</span>
                                            <span>•</span>
                                            <span>@{book.username}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="language-badge text-xs">{book.language}</span>
                                            <span className="px-2 py-1 bg-white/20 rounded text-xs text-white">
                                                {book.genre}
                                            </span>
                                            {book.chapter_count > 0 && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                                    {book.chapter_count} chapters
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-500/10 p-3 rounded-lg mb-4">
                                    <div 
                                        className="flex items-center justify-between text-sm font-semibold text-gray-600 cursor-pointer"
                                        onClick={() => toggleDescription(book.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-robot text-blue-400"></i>
                                            <span>AI Analysis</span>
                                        </div>
                                        <i className={`fas fa-chevron-down transition-transform duration-300 ${expandedDescriptions[book.id] && "rotate-180"}`}></i>
                                    </div>
                                    <div className={`transition-max-height duration-500 ease-in-out overflow-hidden ${expandedDescriptions[book.id] ? 'max-h-96' : 'max-h-0'}`}>
                                        <p className="text-gray-700 text-sm leading-relaxed pt-2">
                                            {book.description}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center text-gray-500 text-sm mb-4">
                                     <StarRating rating={book.avg_rating || 0} size="md" />
                                     <span>{book.review_count || 0} {book.review_count === 1 ? 'review' : 'reviews'}</span>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openBookDetail(book)}
                                        className="btn-secondary flex-1"
                                    >
                                        <i className="fas fa-eye mr-2"></i>
                                        Details
                                    </button>
                                    
                                    <button
                                        onClick={() => downloadBook(book)}
                                        className="btn-secondary"
                                    >
                                        <i className="fas fa-download"></i>
                                    </button>
                                    
                                    <button
                                        onClick={() => shareBook(book)}
                                        className="btn-secondary"
                                    >
                                        <i className="fas fa-share-alt"></i>
                                    </button>
                                    
                                    {currentUser && book.user_id === currentUser.id && (
                                        <>
                                            <button
                                                onClick={() => startEditBook(book)}
                                                className="btn-secondary"
                                                title="Edit book"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            
                                            <button
                                                onClick={() => deleteBook(book.id)}
                                                className="btn-secondary text-red-600"
                                                title="Delete book"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Upload Modal */}
            {showUpload && (
                <div className="modal-overlay" onClick={() => !isUploading && setShowUpload(false)}>
                    <div className="modal-content glass-container !bg-white/30" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-6 text-white">{t.uploadTitle}</h2>
                        
                        {!fileToUpload ? (
                            <div 
                                className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="text-white">
                                    <i className="fas fa-cloud-upload-alt text-4xl mb-4 drop-shadow-lg"></i>
                                    <p className="text-lg font-semibold mb-2 drop-shadow-md">{t.uploadSubtitle}</p>
                                    <p className="text-sm opacity-90 drop-shadow-sm">JSON files only (max 50MB)</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Upload Status */}
                                {(isUploading || uploadStatus) && (
                                    <div className={`upload-status ${uploadStatus} !text-white`}>
                                        <div className="flex items-center justify-center gap-3 mb-2">
                                            {uploadStatus === 'analyzing' && (
                                                <>
                                                    <i className="fas fa-search-plus text-xl"></i>
                                                    <span className="font-semibold">Analyzing file content...</span>
                                                </>
                                            )}
                                            {uploadStatus === 'uploading' && (
                                                <>
                                                    <i className="fas fa-cloud-upload-alt text-xl"></i>
                                                    <span className="font-semibold">Uploading to library...</span>
                                                </>
                                            )}
                                            {uploadStatus === 'complete' && (
                                                <>
                                                    <i className="fas fa-check-circle text-xl"></i>
                                                    <span className="font-semibold">Analysis complete!</span>
                                                </>
                                            )}
                                            {uploadStatus === 'error' && (
                                                <>
                                                    <i className="fas fa-exclamation-triangle text-xl"></i>
                                                    <span className="font-semibold">Upload failed</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-bar-fill" 
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-sm mt-2">
                                            {uploadProgress}% complete
                                        </div>
                                    </div>
                                )}

                                {/* File Preview */}
                                <div className="bg-green-500/20 border border-green-300/30 rounded-lg p-4">
                                    <div className="flex items-center gap-3 text-white">
                                        <i className="fas fa-file-alt text-green-300 text-2xl"></i>
                                        <div>
                                            <p className="font-semibold">{fileToUpload.name}</p>
                                            <p className="text-sm text-white/80">{formatFileSize(fileToUpload.size)}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Upload Form */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={uploadForm.title}
                                            onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                                            className="search-bar"
                                            placeholder="Book title"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1">Author</label>
                                        <input
                                            type="text"
                                            value={uploadForm.author}
                                            onChange={(e) => setUploadForm({...uploadForm, author: e.target.value})}
                                            className="search-bar"
                                            placeholder="Author name"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1">Genre</label>
                                        <select
                                            value={uploadForm.genre}
                                            onChange={(e) => setUploadForm({...uploadForm, genre: e.target.value})}
                                            className="search-bar"
                                        >
                                            {allGenres.map(genre => (
                                                <option key={genre} value={genre} className="bg-gray-700 text-white">{genre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1">Language</label>
                                        <select
                                            value={uploadForm.language}
                                            onChange={(e) => setUploadForm({...uploadForm, language: e.target.value})}
                                            className="search-bar"
                                        >
                                            <option value="auto" className="bg-gray-700 text-white">Auto-detect</option>
                                            <option value="en" className="bg-gray-700 text-white">English</option>
                                            <option value="de" className="bg-gray-700 text-white">Deutsch</option>
                                            <option value="es" className="bg-gray-700 text-white">Español</option>
                                            <option value="fr" className="bg-gray-700 text-white">Français</option>
                                            <option value="it" className="bg-gray-700 text-white">Italiano</option>
                                            <option value="pt" className="bg-gray-700 text-white">Português</option>
                                            <option value="ru" className="bg-gray-700 text-white">Русский</option>
                                            <option value="zh" className="bg-gray-700 text-white">中文</option>
                                            <option value="ja" className="bg-gray-700 text-white">日本語</option>
                                            <option value="ko" className="bg-gray-700 text-white">한국어</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1">Description (Optional)</label>
                                    <textarea
                                        value={uploadForm.description}
                                        onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                                        rows="4"
                                        className="search-bar"
                                        placeholder="Leave empty for AI-generated description"
                                    />
                                </div>
                                
                                {/* AI Analysis Preview */}
                                {analyzedContent && (
                                    <div className="bg-blue-500/20 border border-blue-300/30 rounded-lg p-4">
                                        <div className="flex items-start gap-2 mb-2">
                                            <i className="fas fa-robot text-blue-300 mt-1"></i>
                                            <span className="text-sm font-semibold text-blue-200 uppercase tracking-wide">AI Analysis Preview</span>
                                        </div>
                                        <p className="text-white/90 text-sm leading-relaxed mb-2 max-h-24 overflow-y-auto">
                                            {analyzedContent.description}
                                        </p>
                                        {analyzedContent.chapterCount > 0 && (
                                            <div className="flex gap-2">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                                    {analyzedContent.chapterCount} chapters
                                                </span>
                                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                                    ~{analyzedContent.avgChapterSize} words/chapter
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                            className="hidden"
                        />
                        
                        <div className="flex justify-end gap-4 mt-6">
                            <button 
                                onClick={() => fileToUpload ? cancelUpload() : setShowUpload(false)}
                                disabled={isUploading}
                                className="btn-secondary !text-white !bg-white/10 !border-white/30"
                            >
                                {fileToUpload ? 'Clear' : 'Cancel'}
                            </button>
                            {fileToUpload && (
                                <button 
                                    onClick={confirmUpload}
                                    disabled={isUploading || !uploadForm.title.trim() || !uploadForm.author.trim()}
                                    className={`btn-primary ${(isUploading || !uploadForm.title.trim() || !uploadForm.author.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <i className="fas fa-upload mr-2"></i>
                                    {isUploading ? (uploadStatus === 'uploading' ? 'Uploading...' : 'Processing...') : 'Confirm Upload'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Book Detail Modal */}
            {showBookDetail && selectedBook && (
                <div className="modal-overlay" onClick={closeBookDetail}>
                    <div className="modal-content glass-container !bg-white/30 !text-white max-w-4xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-3xl font-bold">{selectedBook.title}</h2>
                            <button onClick={closeBookDetail} className="text-gray-300 hover:text-white">
                                <i className="fas fa-times text-2xl"></i>
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className={selectedBook.image_url ? "md:col-span-1" : "hidden"}>
                                {selectedBook.image_url && (
                                    <img 
                                        src={selectedBook.image_url}
                                        alt={selectedBook.title}
                                        className="w-full h-auto object-cover rounded-lg shadow-lg"
                                    />
                                )}
                            </div>
                            
                            <div className={selectedBook.image_url ? "md:col-span-2" : "md:col-span-3"}>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <img 
                                            src={`https://images.websim.com/avatar/${selectedBook.username}`}
                                            alt={selectedBook.username}
                                            className="w-10 h-10 rounded-full border-2 border-white/40"
                                        />
                                        <div>
                                            <p className="font-semibold text-lg">{selectedBook.author}</p>
                                            <p className="text-white/70 mb-2">Uploaded by @{selectedBook.username}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-lg">
                                        <StarRating rating={selectedBook.avg_rating || 0} size="lg" />
                                        <span className="text-white/80">
                                            {selectedBook.review_count || 0} {selectedBook.review_count === 1 ? 'Review' : 'Reviews'}
                                        </span>
                                    </div>

                                    <div className="book-stats-grid mb-3">
                                        <div className="book-stat-item !bg-white/5">
                                            <div className="book-stat-value !text-white">{selectedBook.genre}</div>
                                            <div className="book-stat-label !text-white/60">Genre</div>
                                        </div>
                                        <div className="book-stat-item !bg-white/5">
                                            <div className="book-stat-value !text-white">{selectedBook.language.toUpperCase()}</div>
                                            <div className="book-stat-label !text-white/60">Language</div>
                                        </div>
                                        <div className="book-stat-item !bg-white/5">
                                            <div className="book-stat-value !text-white">{selectedBook.download_count || 0}</div>
                                            <div className="book-stat-label !text-white/60">Downloads</div>
                                        </div>
                                        <div className="book-stat-item !bg-white/5">
                                            <div className="book-stat-value !text-white">{formatDate(selectedBook.upload_date)}</div>
                                            <div className="book-stat-label !text-white/60">Uploaded</div>
                                        </div>
                                        {selectedBook.chapter_count > 0 && (
                                            <div className="book-stat-item !bg-white/5">
                                                <div className="book-stat-value !text-white">{selectedBook.chapter_count}</div>
                                                <div className="book-stat-label !text-white/60">Chapters</div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <p className="text-white/90 text-sm bg-white/5 p-3 rounded-lg max-h-40 overflow-y-auto">
                                        {selectedBook.description}
                                    </p>
                                    
                                    <div className="book-management-actions pt-4 border-t border-white/20">
                                        <button
                                            onClick={() => downloadBook(selectedBook)}
                                            className="book-management-btn primary"
                                        >
                                            <i className="fas fa-download"></i>
                                            Download
                                        </button>
                                        
                                        <button
                                            onClick={() => shareBook(selectedBook)}
                                            className="book-management-btn !text-white !bg-white/10 !border-white/30"
                                        >
                                            <i className="fas fa-share-alt"></i>
                                            Share
                                        </button>
                                        
                                        {currentUser && selectedBook.user_id === currentUser.id && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        closeBookDetail();
                                                        startEditBook(selectedBook);
                                                    }}
                                                    className="book-management-btn !text-white !bg-white/10 !border-white/30"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                    Edit
                                                </button>
                                                
                                                <button
                                                    onClick={() => deleteBook(selectedBook.id)}
                                                    className="book-management-btn danger !bg-red-500/20 !border-red-400/50"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reviews Section */}
                        <div className="mt-8 pt-6 border-t border-white/20">
                            <h3 className="text-2xl font-bold mb-4">{t.reviews} ({reviews?.length || 0})</h3>
                            
                            {/* Add Review Form */}
                            {currentUser && (
                                <div className="bg-white/10 p-4 rounded-lg mb-6">
                                    <h4 className="font-semibold mb-3 text-lg">{t.addReview}</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-2">{t.yourRating}</label>
                                            <StarRating 
                                                rating={reviews?.find(r => r.user_id === currentUser.id)?.rating || 0} 
                                                onRatingChange={(newRating) => {
                                                    const existingReview = reviews?.find(r => r.user_id === currentUser.id);
                                                    handleReviewSubmit(selectedBook.id, newRating, existingReview?.comment || '');
                                                }}
                                                size="xl"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-1">{t.yourComment}</label>
                                            <form onSubmit={(e) => {
                                                e.preventDefault();
                                                const rating = reviews?.find(r => r.user_id === currentUser.id)?.rating || 0;
                                                handleReviewSubmit(selectedBook.id, rating, e.target.comment.value);
                                                e.target.comment.value = '';
                                            }}>
                                                <textarea 
                                                    name="comment"
                                                    rows="3"
                                                    defaultValue={reviews?.find(r => r.user_id === currentUser.id)?.comment || ''}
                                                    className="search-bar !bg-white/20 !text-white"
                                                    placeholder="Share your thoughts about this book..."
                                                ></textarea>
                                                <button type="submit" className="btn-primary mt-2">
                                                    {t.submitReview}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reviews List */}
                            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                                {reviewsLoading ? (
                                    <p>Loading reviews...</p>
                                ) : (
                                    reviews && reviews.length > 0 ? (
                                        reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(review => (
                                            <div key={review.id} className="bg-white/5 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <img 
                                                            src={`https://images.websim.com/avatar/${review.username}`}
                                                            alt={review.username}
                                                            className="w-8 h-8 rounded-full"
                                                        />
                                                        <span className="font-semibold">@{review.username}</span>
                                                    </div>
                                                    <StarRating rating={review.rating} />
                                                </div>
                                                <p className="text-white/90">{review.comment}</p>
                                                <p className="text-xs text-white/60 mt-2 text-right">{new Date(review.created_at).toLocaleDateString()}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-white/70">No reviews yet. Be the first to leave one!</p>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Management Modal */}
            {showManagement && (
                <div className="modal-overlay" onClick={() => setShowManagement(false)}>
                    <div className="modal-content glass-container !bg-white/30 !text-white max-w-4xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold">{t.managementTitle}</h2>
                            <button onClick={() => setShowManagement(false)} className="text-gray-300 hover:text-white">
                                <i className="fas fa-times text-2xl"></i>
                            </button>
                        </div>
                        
                        {/* Management Tabs */}
                        <div className="management-tabs">
                            <button 
                                className={`management-tab ${managementTab === 'myBooks' ? 'active' : ''} !text-white/80`}
                                onClick={() => setManagementTab('myBooks')}
                            >
                                <i className="fas fa-book mr-2"></i>
                                My Books ({userBooks?.length || 0})
                            </button>
                            <button 
                                className={`management-tab ${managementTab === 'savedBooks' ? 'active' : ''} !text-white/80`}
                                onClick={() => setManagementTab('savedBooks')}
                            >
                                <i className="fas fa-heart mr-2"></i>
                                Saved Books ({savedBooks?.length || 0})
                            </button>
                        </div>
                        
                        {/* Tab Content */}
                        <div className="max-h-96 overflow-y-auto p-1">
                            {managementTab === 'myBooks' && (
                                <>
                                    {userBooks && userBooks.length > 0 ? (
                                        <div className="space-y-4">
                                            {userBooks.map(book => (
                                                <div key={book.id} className="book-management-card">
                                                    {book.image_url && (
                                                        <div className="mb-4">
                                                            <img 
                                                                src={book.image_url}
                                                                alt={book.title}
                                                                className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-lg text-white mb-1">{book.title}</h3>
                                                        <p className="text-white/70 mb-2">by {book.author}</p>
                                                        
                                                        <div className="book-stats-grid mb-3">
                                                            <div className="book-stat-item !bg-white/5">
                                                                <div className="book-stat-value !text-white">{book.genre}</div>
                                                                <div className="book-stat-label !text-white/60">Genre</div>
                                                            </div>
                                                            <div className="book-stat-item !bg-white/5">
                                                                <div className="book-stat-value !text-white">{book.language.toUpperCase()}</div>
                                                                <div className="book-stat-label !text-white/60">Language</div>
                                                            </div>
                                                            <div className="book-stat-item !bg-white/5">
                                                                <div className="book-stat-value !text-white">{book.download_count || 0}</div>
                                                                <div className="book-stat-label !text-white/60">Downloads</div>
                                                            </div>
                                                            <div className="book-stat-item !bg-white/5">
                                                                <div className="book-stat-value !text-white">{formatDate(book.upload_date)}</div>
                                                                <div className="book-stat-label !text-white/60">Uploaded</div>
                                                            </div>
                                                            {book.chapter_count > 0 && (
                                                                <div className="book-stat-item !bg-white/5">
                                                                    <div className="book-stat-value !text-white">{book.chapter_count}</div>
                                                                    <div className="book-stat-label !text-white/60">Chapters</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <p className="text-sm text-white/90 bg-white/5 p-3 rounded-lg mb-3 line-clamp-2">
                                                            {book.description}
                                                        </p>
                                                        
                                                        <div className="book-management-actions">
                                                            <button
                                                                onClick={() => openBookDetail(book)}
                                                                className="book-management-btn primary"
                                                            >
                                                                <i className="fas fa-eye"></i>
                                                                Details
                                                            </button>
                                                            <button
                                                                onClick={() => downloadBook(book)}
                                                                className="book-management-btn !text-white !bg-white/10 !border-white/30"
                                                            >
                                                                <i className="fas fa-download"></i>
                                                                Download
                                                            </button>
                                                            <button
                                                                onClick={() => shareBook(book)}
                                                                className="book-management-btn !text-white !bg-white/10 !border-white/30"
                                                            >
                                                                <i className="fas fa-share-alt"></i>
                                                                Share
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setShowManagement(false);
                                                                    startEditBook(book);
                                                                }}
                                                                className="book-management-btn !text-white !bg-white/10 !border-white/30"
                                                            >
                                                                <i className="fas fa-edit"></i>
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => deleteBook(book.id)}
                                                                className="book-management-btn danger !bg-red-500/20 !border-red-400/50"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state">
                                            <i className="fas fa-book empty-state-icon"></i>
                                            <h3 className="text-lg font-semibold mb-2">No books uploaded yet</h3>
                                            <p className="text-gray-500 mb-4">Start sharing your digital library by uploading your first book!</p>
                                            <button 
                                                onClick={() => {
                                                    setShowManagement(false);
                                                    setShowUpload(true);
                                                }}
                                                className="btn-primary"
                                            >
                                                <i className="fas fa-upload"></i>
                                                Upload Your First Book
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            {managementTab === 'savedBooks' && (
                                <>
                                    {savedBooks && savedBooks.length > 0 ? (
                                        <div className="space-y-4">
                                            {savedBooks.map(saveRecord => {
                                                const book = books.find(b => b.id === saveRecord.book_id);
                                                if (!book) return null;
                                                
                                                return (
                                                    <div key={saveRecord.id} className="book-management-card">
                                                        {book.image_url && (
                                                            <div className="mb-4">
                                                                <img 
                                                                    src={book.image_url}
                                                                    alt={book.title}
                                                                    className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-bold text-lg text-white mb-1">{book.title}</h3>
                                                            <p className="text-white/70 mb-2">by {book.author}</p>
                                                            
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <img 
                                                                    src={`https://images.websim.com/avatar/${book.username}`}
                                                                    alt={book.username}
                                                                    className="w-5 h-5 rounded-full"
                                                                />
                                                                <span className="text-sm text-white/60">Uploaded by @{book.username}</span>
                                                            </div>
                                                            
                                                            <div className="book-stats-grid mb-3">
                                                                <div className="book-stat-item !bg-white/5">
                                                                    <div className="book-stat-value !text-white">{book.genre}</div>
                                                                    <div className="book-stat-label !text-white/60">Genre</div>
                                                                </div>
                                                                <div className="book-stat-item !bg-white/5">
                                                                    <div className="book-stat-value !text-white">{book.language.toUpperCase()}</div>
                                                                    <div className="book-stat-label !text-white/60">Language</div>
                                                                </div>
                                                                <div className="book-stat-item !bg-white/5">
                                                                    <div className="book-stat-value !text-white">{book.download_count || 0}</div>
                                                                    <div className="book-stat-label !text-white/60">Downloads</div>
                                                                </div>
                                                                <div className="book-stat-item !bg-white/5">
                                                                    <div className="book-stat-value !text-white">{formatDate(saveRecord.created_at)}</div>
                                                                    <div className="book-stat-label !text-white/60">Saved</div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="book-management-actions">
                                                                <button
                                                                    onClick={() => openBookDetail(book)}
                                                                    className="book-management-btn primary"
                                                                >
                                                                    <i className="fas fa-eye"></i>
                                                                    Details
                                                                </button>
                                                                <button
                                                                    onClick={() => downloadBook(book)}
                                                                    className="book-management-btn !text-white !bg-white/10 !border-white/30"
                                                                >
                                                                    <i className="fas fa-download"></i>
                                                                    Download
                                                                </button>
                                                                <button
                                                                    onClick={() => shareBook(book)}
                                                                    className="book-management-btn !text-white !bg-white/10 !border-white/30"
                                                                >
                                                                    <i className="fas fa-share-alt"></i>
                                                                    Share
                                                                </button>
                                                                <button
                                                                    onClick={() => saveToMyBooks(book)}
                                                                    className="book-management-btn danger !bg-red-500/20 !border-red-400/50"
                                                                >
                                                                    <i className="fas fa-heart-broken"></i>
                                                                    Remove from Saved
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="empty-state">
                                            <i className="fas fa-heart empty-state-icon"></i>
                                            <h3 className="text-lg font-semibold mb-2">No saved books yet</h3>
                                            <p className="text-gray-500 mb-4">Browse the library and save books you want to read later!</p>
                                            <button 
                                                onClick={() => setShowManagement(false)}
                                                className="btn-primary"
                                            >
                                                <i className="fas fa-search mr-2"></i>
                                                Browse Books
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Login Modal */}
            {showLogin && (
                <div className="modal-overlay" onClick={() => !isLoggingIn && setShowLogin(false)}>
                    <div className="modal-content glass-container !bg-white/30 !text-white max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="mb-6">
                                <i className="fas fa-user-circle text-6xl text-blue-500 mb-4"></i>
                                <h2 className="text-2xl font-bold mb-2">
                                    {currentLanguage === 'de' ? 'Bei WebSim anmelden' : 'Login to WebSim'}
                                </h2>
                                <p className="text-gray-600">
                                    {currentLanguage === 'de' 
                                        ? 'Melden Sie sich mit Ihrem WebSim-Konto an, um Bücher hochzuladen und zu verwalten.'
                                        : 'Sign in with your WebSim account to upload and manage books.'
                                    }
                                </p>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-2">
                                        <i className="fas fa-info-circle text-blue-500 mt-1"></i>
                                        <div className="text-left text-sm">
                                            <p className="font-semibold text-blue-800 mb-1">
                                                {currentLanguage === 'de' ? 'WebSim-Konto erforderlich' : 'WebSim Account Required'}
                                            </p>
                                            <p className="text-blue-700">
                                                {currentLanguage === 'de' 
                                                    ? 'Sie benötigen ein WebSim-Konto, um Bücher hochzuladen und zu verwalten. Die Anmeldung ist kostenlos!'
                                                    : 'You need a WebSim account to upload and manage books. Registration is free!'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleLogin}
                                    disabled={isLoggingIn}
                                    className={`btn-primary w-full ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isLoggingIn ? (
                                        <>
                                            <div className="loading-spinner mr-2"></div>
                                            {currentLanguage === 'de' ? 'Anmelden...' : 'Signing in...'}
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-external-link-alt mr-2"></i>
                                            {currentLanguage === 'de' ? 'Bei WebSim anmelden' : 'Sign in with WebSim'}
                                        </>
                                    )}
                                </button>
                                
                                <p className="text-xs text-gray-500">
                                    {currentLanguage === 'de' 
                                        ? 'Sie werden zu websim.ai weitergeleitet'
                                        : 'You will be redirected to websim.ai'
                                    }
                                </p>
                            </div>
                            
                            <div className="flex justify-center mt-6">
                                <button 
                                    onClick={() => setShowLogin(false)}
                                    disabled={isLoggingIn}
                                    className="btn-secondary"
                                >
                                    {currentLanguage === 'de' ? 'Abbrechen' : 'Cancel'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification */}
            {notification && (
                <div className={`notification ${notification.type} ${notification ? 'show' : ''}`}>
                    <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`}></i>
                    {notification.message}
                </div>
            )}
            
            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-links">
                        <a href="https://book.on.websim.ai" className="footer-link" target="_blank" rel="noopener noreferrer">
                            <i className="fas fa-book mr-2"></i>
                            Create Books on book.on.websim.ai
                        </a>
                        <a href="https://websim.ai" className="footer-link" target="_blank" rel="noopener noreferrer">
                            <i className="fas fa-globe mr-2"></i>
                            WebSim.ai
                        </a>
                    </div>
                    <div className="text-center">
                        <p className="mb-2">
                            {t.footerText} <strong>book.on.websim.ai</strong>
                        </p>
                        <p className="text-lg">
                            {t.greetings}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<BookShareApp />);