// story-details-settings.js

// --- I18N Story Details Strings (for dropdowns and option values too) ---
const STORY_DETAILS_LANG = {
    en: {
        tabTitle: "Story Details",
        genre: "Story Genre",
        genreSelect: "Select Story Genre...",
        genreOwn: "Own Story Genre...",
        // GENRES (EN) - expanded
        adventure: "Adventure",
        mystery: "Mystery",
        "sci-fi": "Science Fiction",
        fantasy: "Fantasy",
        romance: "Romance",
        historical: "Historical Fiction",
        thriller: "Thriller",
        horror: "Horror",
        comedy: "Comedy",
        drama: "Drama",
        crime: "Crime",
        western: "Western",
        dystopian: "Dystopian",
        utopian: "Utopian",
        cyberpunk: "Cyberpunk",
        steampunk: "Steampunk",
        paranormal: "Paranormal",
        urban_fantasy: "Urban Fantasy",
        high_fantasy: "High Fantasy",
        epic_fantasy: "Epic Fantasy",
        magical_realism: "Magical Realism",
        bildungsroman: "Bildungsroman (Coming-of-Age)",
        satire: "Satire",
        philosophical: "Philosophical",
        psychological: "Psychological",
        political: "Political Fiction",
        family: "Family Saga",
        young_adult: "Young Adult",
        children: "Children's",
        war: "War",
        humor: "Humor",
        chick_lit: "Chick Lit",
        spy: "Spy",
        gothic: "Gothic",
        fairy_tale: "Fairy Tale",
        mythology: "Mythology",
        legend: "Legend",
        post_apocalyptic: "Post-Apocalyptic",
        apocalyptic: "Apocalyptic",
        historical_romance: "Historical Romance",
        space_opera: "Space Opera",
        superhero: "Superhero",
        procedural: "Procedural",
        slice_of_life: "Slice of Life",
        sports: "Sports",
        medical: "Medical",
        legal: "Legal",
        travel: "Travel",
        philosophical_treatise: "Philosophical Treatise",
        // Massive extension
        action: "Action",
        espionage: "Espionage",
        noir: "Noir",
        animal_fable: "Animal Fable",
        bildungsroman_fantasy: "Coming-of-Age Fantasy",
        cli_fi: "Climate Fiction",
        epistolary: "Epistolary",
        memoir: "Memoir",
        biography: "Biography",
        narrative_nonfiction: "Narrative Nonfiction",
        science: "Science",
        nature: "Nature Writing",
        essay: "Essay",
        classic_literature: "Classic Literature",
        inspirational: "Inspirational",
        moralistic: "Moralistic",
        adventure_fantasy: "Adventure Fantasy",
        urban_romance: "Urban Romance",
        domestic: "Domestic Fiction",
        social_commentary: "Social Commentary",
        experimental: "Experimental",
        weird_fiction: "Weird Fiction",
        slipstream: "Slipstream",
        alternate_history: "Alternate History",
        technothriller: "Technothriller",
        hard_science_fiction: "Hard Science Fiction",
        light_novel: "Light Novel",
        game_lit: "GameLit",
        lit_rpg: "LitRPG",
        time_travel: "Time Travel",
        superpower: "Superpower",
        cultivation: "Cultivation (Eastern Fantasy)",
        military: "Military Fiction",
        dark_fantasy: "Dark Fantasy",
        portal_fantasy: "Portal Fantasy",
        fae: "Fae",
        fairycore: "Fairycore/Faerie",
        mythpunk: "Mythpunk",
        solarpunk: "Solarpunk",
        planetary_romance: "Planetary Romance",
        romance_comedy: "Romantic Comedy",
        regency_romance: "Regency Romance",
        paranormal_romance: "Paranormal Romance",
        // Main conflict types...
        // ... (keep unchanged)
        conflict: "Main Conflict Type",
        conflictSelect: "Select Main Conflict Type...",
        conflictOwn: "Own Main Conflict Type...",
        conflictNone: "None",
        person_vs_person: "Person vs. Person",
        person_vs_self: "Person vs. Self",
        person_vs_nature: "Person vs. Nature",
        person_vs_society: "Person vs. Society",
        person_vs_technology: "Person vs. Technology",
        person_vs_supernatural: "Person vs. Supernatural/Fate",
        person_vs_machine: "Person vs. Machine/AI",
        person_vs_animal: "Person vs. Animal",
        group_vs_group: "Group vs. Group",
        group_vs_nature: "Group vs. Nature",
        group_vs_society: "Group vs. Society",
        group_vs_supernatural: "Group vs. Supernatural/Fate",
        // More:
        person_vs_environment: "Person vs. Environment",
        person_vs_god: "Person vs. God",
        person_vs_time: "Person vs. Time",
        person_vs_alien: "Person vs. Alien",
        group_vs_time: "Group vs. Time",
        group_vs_culture: "Group vs. Culture",
        // Beginning
        beginning: "Beginning Style",
        beginningSelect: "Select Beginning Style...",
        beginningOwn: "Own Beginning Style...",
        in_medias_res: "In Medias Res (In the Middle of Action)",
        introduction: "Character/Setting Introduction",
        flashback_open: "Open with Flashback",
        frame_narrative: "Frame Narrative",
        prophecy_open: "Prophecy",
        letter_or_diary: "Letter or Diary",
        news_report: "News Report",
        dream_open: "Dream Sequence",
        prologue: "Prologue",
        action_start: "Action Opening",
        quote_opening: "Quote or Epigraph",
        unknown_past: "Unknown Past",
        lost_in_time: "Time Displacement",
        lore_dump: "Lore Dump/Info Dump",
        mystery_open: "Mysterious Incident",
        // Midpart (extended)
        midpart: "Midpart Focus",
        midpartSelect: "Select Midpart Focus...",
        midpartOwn: "Own Midpart Focus...",
        rising_action: "Rising Action (Building Tension)",
        complications: "Obstacles and Complications",
        reversal: "Reversal (Turning Point)",
        mirror_scene: "Mirror Scene",
        character_discovery: "Character Discovery",
        subplot_focus: "Subplot Focus",
        escalation: "Escalation",
        moral_dilemma: "Moral Dilemma",
        training_montage: "Training/Preparation",
        betrayal_reveal: "Betrayal/Spy Reveal",
        fateful_encounter: "Fateful Encounter",
        // Ending (expanded)
        ending: "Ending Type",
        endingSelect: "Select Ending Type...",
        endingOwn: "Own Ending Type...",
        climax_resolution: "Climax and Full Resolution",
        cliffhanger: "Cliffhanger (Setup for Sequel)",
        twist_ending: "Twist Ending",
        bittersweet: "Bittersweet",
        moral: "Moral/Didactic",
        happy: "Happy Ending",
        tragic: "Tragic Ending",
        ambiguous: "Ambiguous/Unresolved",
        cyclical: "Cyclical Ending",
        revelation: "Major Revelation",
        open: "Open/Continuing",
        redemption_arc: "Redemption Arc",
        villain_win: "Villain Victory",
        deus_ex_machina: "Deus Ex Machina",
        anti_climax: "Anti-Climax",
        post_credits: "Post-Credits Scene",
        // Core theme (expanded set)
        core: "Core Theme",
        coreSelect: "Select Core Theme...",
        coreOwn: "Own Core Theme...",
        survival: "Survival",
        revenge: "Revenge",
        love: "Love",
        friendship: "Friendship",
        betrayal: "Betrayal",
        sacrifice: "Sacrifice",
        redemption: "Redemption",
        power: "Power",
        freedom: "Freedom",
        justice: "Justice",
        loss: "Loss",
        self_discovery: "Self-Discovery",
        destiny: "Destiny",
        courage: "Courage",
        faith: "Faith",
        family: "Family",
        prejudice: "Prejudice",
        war_peace: "War & Peace",
        humanity: "Humanity",
        heroism: "Heroism",
        loyalty: "Loyalty",
        ambition: "Ambition",
        corruption: "Corruption",
        hope: "Hope",
        despair: "Despair",
        tradition: "Tradition",
        progress: "Progress",
        fate: "Fate",
        technology: "Technology",
        nature: "Nature",
        alienation: "Alienation",
        class_struggle: "Class Struggle/Society",
        // Authors (expanded)
        author: "Write Like",
        authorSelect: "Select Author...",
        authorOwn: "Own Author...",
        jane_austen: "Jane Austen",
        charles_dickens: "Charles Dickens",
        j_k_rowling: "J. K. Rowling",
        mark_twain: "Mark Twain",
        stephen_king: "Stephen King",
        agatha_christie: "Agatha Christie",
        george_orwell: "George Orwell",
        ernest_hemingway: "Ernest Hemingway",
        leo_tolstoy: "Leo Tolstoy",
        haruki_murakami: "Haruki Murakami",
        franz_kafka: "Franz Kafka",
        fairy_tale_collector: "Brothers Grimm",
        science_writer: "Isaac Asimov",
        fantasy_modern: "Brandon Sanderson",
        f_scott_fitzgerald: "F. Scott Fitzgerald",
        virginia_woolf: "Virginia Woolf",
        tolkien: "J.R.R. Tolkien",
        dostoevsky: "Fyodor Dostoevsky",
        albert_cam_us: "Albert Camus",
        isabel_allende: "Isabel Allende",
        orhan_pamuk: "Orhan Pamuk",
        margaret_atwood: "Margaret Atwood",
        ursula_le_guin: "Ursula K. Le Guin",
        neil_gaiman: "Neil Gaiman",
        cormac_mccarthy: "Cormac McCarthy",
        octavia_e_butler: "Octavia E. Butler"
    },
    // ...other language blocks as in original (de/fr), add additional translations as needed...
};

// ...existing language selector helper functions & content creation as in previous version 
// except below block is changed: genreOptionList, conflictOptions, beginningOptions, midpartOptions, endingOptions, coreConflictOptions & writeLikeAuthorOptions are significantly expanded as above

export function createStoryDetailsContent(config, state, aiCommandConsole, logToAIConsole) {
    const container = document.createElement('div');
    container.classList.add('settings-section');
    container.id = 'story-details-settings';

    const title = document.createElement('h3');
    title.textContent = t('tabTitle');
    container.appendChild(title);

    // Prepare genreOptionList now much larger
    const genreOptionList = [
        "adventure","mystery","sci-fi","fantasy","romance","historical","thriller","horror","comedy","drama","crime","western","dystopian","utopian","cyberpunk","steampunk","paranormal","urban_fantasy","high_fantasy","epic_fantasy","magical_realism","bildungsroman","satire","philosophical","psychological","political","family","young_adult","children","war","humor","chick_lit","spy","gothic","fairy_tale","mythology","legend","post_apocalyptic","apocalyptic","historical_romance","space_opera","superhero","procedural","slice_of_life","sports","medical","legal","travel","philosophical_treatise",
        // Extended
        "action","espionage","noir","animal_fable","bildungsroman_fantasy","cli_fi","epistolary","memoir","biography","narrative_nonfiction","science","nature","essay","classic_literature","inspirational","moralistic","adventure_fantasy","urban_romance","domestic","social_commentary","experimental","weird_fiction","slipstream","alternate_history","technothriller","hard_science_fiction","light_novel","game_lit","lit_rpg","time_travel","superpower","cultivation","military","dark_fantasy","portal_fantasy","fae","fairycore","mythpunk","solarpunk","planetary_romance","romance_comedy","regency_romance","paranormal_romance"
    ];

    const conflictOptions = [
        "person_vs_person","person_vs_self","person_vs_nature","person_vs_society","person_vs_technology","person_vs_supernatural","person_vs_machine","person_vs_animal","group_vs_group","group_vs_nature","group_vs_society","group_vs_supernatural",
        // Extended 
        "person_vs_environment","person_vs_god","person_vs_time","person_vs_alien","group_vs_time","group_vs_culture"
    ];

    const beginningOptions = [
        "in_medias_res","introduction","flashback_open","frame_narrative","prophecy_open","letter_or_diary","news_report","dream_open",
        // Extended
        "prologue","action_start","quote_opening","unknown_past","lost_in_time","lore_dump","mystery_open"
    ];

    const midpartOptions = [
        "rising_action","complications","reversal","mirror_scene","character_discovery","subplot_focus","escalation",
        // Extended
        "moral_dilemma","training_montage","betrayal_reveal","fateful_encounter"
    ];

    const endingOptions = [
        "climax_resolution","cliffhanger","twist_ending","bittersweet","moral","happy","tragic","ambiguous",
        // Extended
        "cyclical","revelation","open","redemption_arc","villain_win","deus_ex_machina","anti_climax","post_credits"
    ];

    const coreConflictOptions = [
        "survival","revenge","love","friendship","betrayal","sacrifice","redemption","power","freedom","justice","loss","self_discovery","destiny","courage","faith","family","prejudice","war_peace","humanity","heroism","loyalty",
        // Extended
        "ambition","corruption","hope","despair","tradition","progress","fate","technology","nature","alienation","class_struggle"
    ];

    const writeLikeAuthorOptions = [
        "jane_austen","charles_dickens","j_k_rowling","mark_twain","stephen_king","agatha_christie","george_orwell","ernest_hemingway",
        "leo_tolstoy","haruki_murakami","franz_kafka","fairy_tale_collector","science_writer","fantasy_modern","f_scott_fitzgerald",
        // Expanded
        "virginia_woolf","tolkien","dostoevsky","albert_cam_us","isabel_allende","orhan_pamuk","margaret_atwood","ursula_le_guin",
        "neil_gaiman","cormac_mccarthy","octavia_e_butler"
    ];

    // Helper: build dropdown (as before)
    function createDropdown(id, labelText, options, customPlaceholder, includeNone=false, logPrefix = labelText, selectTxt=null, ownTxt=null, noneTxt=null) {
        const group = document.createElement('div');
        group.style.marginBottom = '15px';

        const label = document.createElement('label');
        label.setAttribute('for', id);
        label.textContent = labelText + ':';
        label.style.display = 'block';
        label.style.marginBottom = '5px';
        group.appendChild(label);

        const select = document.createElement('select');
        select.id = id;
        select.name = id;
        group.appendChild(select);

        // Custom input (hidden initially)
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.id = `custom-${id}-input`;
        customInput.placeholder = customPlaceholder || t(id+"Own");
        customInput.classList.add('custom-input');
        customInput.style.display = 'none';
        customInput.style.marginTop = '5px';
        group.appendChild(customInput);

        // Default "select..." option (translatable)
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = selectTxt || t(id + 'Select') || ('Select ' + labelText + '...');
        select.appendChild(defaultOption);

        // Own/Custom
        const customOption = document.createElement('option');
        customOption.value = "_custom";
        customOption.textContent = ownTxt || t(id+'Own') || 'Own ' + labelText + '...';
        select.appendChild(customOption);

        // "None" option if needed
        if (includeNone) {
            const noneOption = document.createElement('option');
            noneOption.value = "none";
            noneOption.textContent = noneTxt || t(id+'None') || "None";
            select.appendChild(noneOption);
        }

        // Each real option - use translation; for authors/genres/etc
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = t(opt);
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            const selectedValue = select.value;
            if (selectedValue === '_custom') {
                customInput.style.display = 'block';
                customInput.value = '';
                customInput.focus();
                logToAIConsole(state.commandHistory, aiCommandConsole, `${logPrefix} set to: ${ownTxt || ("Own " + labelText)} (input required)`);
            } else {
                customInput.style.display = 'none';
                const selectedText = select.options[select.selectedIndex]?.text || '(Cleared)';
                logToAIConsole(state.commandHistory, aiCommandConsole, `${logPrefix} setting changed to: "${selectedText}"`);
            }
        });

        customInput.addEventListener('change', () => {
            if (select.value === '_custom') {
                const customValue = customInput.value.trim();
                logToAIConsole(state.commandHistory, aiCommandConsole, `Custom ${logPrefix} input: "${customValue || '(empty)'}"`);
            }
        });

        container.appendChild(group);
        return group;
    };

    createDropdown('story-genre', t('genre'), genreOptionList, t('genreOwn'), false, t('genre'), t('genreSelect'), t('genreOwn'));
    createDropdown('story-conflict', t('conflict'), conflictOptions, t('conflictOwn'), true, t('conflict'), t('conflictSelect'), t('conflictOwn'), t('conflictNone'));
    createDropdown('story-beginning', t('beginning'), beginningOptions, t('beginningOwn'), false, t('beginning'), t('beginningSelect'), t('beginningOwn'));
    createDropdown('story-midpart', t('midpart'), midpartOptions, t('midpartOwn'), false, t('midpart'), t('midpartSelect'), t('midpartOwn'));
    createDropdown('story-ending', t('ending'), endingOptions, t('endingOwn'), false, t('ending'), t('endingSelect'), t('endingOwn'));
    createDropdown('story-core-conflict', t('core'), coreConflictOptions, t('coreOwn'), false, t('core'), t('coreSelect'), t('coreOwn'));
    createDropdown('write-like-author', t('author'), writeLikeAuthorOptions, t('authorOwn'), false, t('author'), t('authorSelect'), t('authorOwn'));

    return container;
}

// --- Helper functions for detected lang ---
function getStoryDetailsLang() {
    let lang = document.documentElement.getAttribute('lang') ||
        localStorage.getItem('preferredLanguage') ||
        navigator.language || 'en';
    if (lang && lang.length > 2) lang = lang.split('-')[0].toLowerCase();
    return STORY_DETAILS_LANG[lang] ? lang : 'en';
}
function t(key) {
    const lang = getStoryDetailsLang();
    return (STORY_DETAILS_LANG[lang] && STORY_DETAILS_LANG[lang][key]) || STORY_DETAILS_LANG['en'][key] || key;
}

function createOption(value, labelKey) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = t(labelKey || value);
    return option;
}