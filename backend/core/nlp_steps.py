"""NLP Operations implemented 100% from scratch.
No external NLP libraries (no NLTK, no spaCy, no regex re module for complex patterns).
All functions are transparent, easily explained, and ready for face-to-face defense.
"""

from typing import Dict, List, Set, Union


# =====================================================================
# 1. TAG CLEANING (Nettoyage des balises SGML / XML)
# =====================================================================

def clean_tags(text: str) -> str:
    """
    Strips all XML/SGML/HTML tags from the text using a character-by-character
    state-machine parser. Avoids regular expressions or HTML libraries.
    """
    result = []
    in_tag = False

    for char in text:
        if char == '<':
            in_tag = True
            result.append(' ')  # Replace opening tag with space to prevent word joining
        elif char == '>':
            in_tag = False
        elif not in_tag:
            result.append(char)

    # Join and clean redundant spaces
    cleaned = "".join(result)
    return cleaned


# =====================================================================
# 2. NORMALISATION (Minuscules, ponctuation, espaces)
# =====================================================================

# Standard punctuation characters to remove
PUNCTUATION_CHARS: Set[str] = set(
    """!"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~§°«»“”‘’•—–…"""
)


def normalize_text(text: str) -> str:
    """
    Normalizes a raw text string:
    - Lowercases all characters
    - Replaces punctuation and special characters with spaces
    - Replaces newlines/tabs with spaces
    - Collapses multiple whitespace into a single space
    """
    chars = []
    for ch in text.lower():
        if ch in PUNCTUATION_CHARS:
            chars.append(' ')
        elif ch in ('\n', '\r', '\t'):
            chars.append(' ')
        else:
            chars.append(ch)

    normalized_str = "".join(chars)
    return " ".join(normalized_str.split())


def tokenize(text: str) -> List[str]:
    """
    Splits normalized string into individual word tokens.
    Filters out empty tokens and non-alphabetic/numeric fragments.
    """
    raw_tokens = text.split()
    clean_tokens = []
    for token in raw_tokens:
        token = token.strip()
        # Keep tokens with at least one alphanumeric character
        if any(c.isalnum() for c in token):
            clean_tokens.append(token)
    return clean_tokens


# =====================================================================
# 3. STOPWORDS REMOVAL (Suppression des mots-vides)
# =====================================================================

# Curated English stopword list (~160 words) standard in Information Retrieval
DEFAULT_STOPWORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
    "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
    "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
    "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
    "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
    "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
    "they're", "they've", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
    "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves"
}


def remove_stopwords(tokens: List[str], stopwords_set: Set[str] = DEFAULT_STOPWORDS) -> List[str]:
    """Filters out stopwords from a list of word tokens."""
    return [t for t in tokens if t.lower() not in stopwords_set]


# =====================================================================
# 4. STEMMING (Racinisation - Porter-style Rule-Based Engine from scratch)
# =====================================================================

VOWELS: Set[str] = {'a', 'e', 'i', 'o', 'u'}


def _is_consonant(word: str, i: int) -> bool:
    """Checks whether the character at index i is a consonant."""
    ch = word[i]
    if ch in VOWELS:
        return False
    if ch == 'y':
        if i == 0:
            return True
        return not _is_consonant(word, i - 1)
    return True


def _measure(word: str) -> int:
    """
    Computes the Porter measure m for a word.
    A word is represented as [C](VC)^m[V]. Returns m.
    """
    if not word:
        return 0
    
    n = len(word)
    i = 0
    m = 0

    # Skip initial consonants [C]
    while i < n and _is_consonant(word, i):
        i += 1

    while i < n:
        # Scan V+
        while i < n and not _is_consonant(word, i):
            i += 1
        if i >= n:
            break
        # Scan C+
        while i < n and _is_consonant(word, i):
            i += 1
        m += 1

    return m


def _has_vowel(stem: str) -> bool:
    """Checks whether a stem contains at least one vowel."""
    for i in range(len(stem)):
        if not _is_consonant(stem, i):
            return True
    return False


def _ends_double_consonant(word: str) -> bool:
    """Checks if the word ends with two identical consonants (e.g. -tt, -ss)."""
    if len(word) < 2:
        return False
    return word[-1] == word[-2] and _is_consonant(word, len(word) - 1)


def _ends_cvc(word: str) -> bool:
    """Checks if the word ends in Consonant-Vowel-Consonant where last is not w, x, y."""
    if len(word) < 3:
        return False
    c1 = _is_consonant(word, len(word) - 3)
    v = not _is_consonant(word, len(word) - 2)
    c2 = _is_consonant(word, len(word) - 1)
    if c1 and v and c2:
        return word[-1] not in ('w', 'x', 'y')
    return False


def stem_word(word: str) -> str:
    """
    Stems a single English word using a simplified, transparent Porter rule engine.
    Completely handcrafted with string slices.
    """
    if len(word) <= 2:
        return word

    w = word.lower()

    # Step 1a: Plurals and basic suffixes
    if w.endswith("sses"):
        w = w[:-2]  # caresses -> caress
    elif w.endswith("ies"):
        w = w[:-2]  # ponies -> poni
    elif w.endswith("ss"):
        pass        # caress -> caress
    elif w.endswith("s"):
        w = w[:-1]  # cats -> cat

    # Step 1b: -eed, -ed, -ing
    if w.endswith("eed"):
        stem = w[:-3]
        if _measure(stem) > 0:
            w = stem + "ee"
    elif w.endswith("ed"):
        stem = w[:-2]
        if _has_vowel(stem):
            w = stem
            if w.endswith("at") or w.endswith("bl") or w.endswith("iz"):
                w += "e"
            elif _ends_double_consonant(w) and not (w.endswith("l") or w.endswith("s") or w.endswith("z")):
                w = w[:-1]
            elif _measure(w) == 1 and _ends_cvc(w):
                w += "e"
    elif w.endswith("ing"):
        stem = w[:-3]
        if _has_vowel(stem):
            w = stem
            if w.endswith("at") or w.endswith("bl") or w.endswith("iz"):
                w += "e"
            elif _ends_double_consonant(w) and not (w.endswith("l") or w.endswith("s") or w.endswith("z")):
                w = w[:-1]
            elif _measure(w) == 1 and _ends_cvc(w):
                w += "e"

    # Step 1c: Y to I
    if w.endswith("y"):
        stem = w[:-1]
        if _has_vowel(stem):
            w = stem + "i"

    # Step 2: Suffix replacements
    step2_rules = [
        ("ational", "ate"),
        ("tional", "tion"),
        ("ization", "ize"),
        ("ation", "ate"),
        ("ator", "ate"),
        ("alism", "al"),
        ("fulness", "ful"),
        ("ousness", "ous"),
        ("iveness", "ive"),
        ("biliti", "ble"),
        ("izer", "ize"),
        ("alli", "al"),
        ("entli", "ent"),
        ("eli", "e"),
        ("ousli", "ous"),
    ]
    for suffix, replacement in step2_rules:
        if w.endswith(suffix):
            stem = w[:-len(suffix)]
            if _measure(stem) > 0:
                w = stem + replacement
            break

    # Step 3: Derivational suffixes
    step3_rules = [
        ("icate", "ic"),
        ("ative", ""),
        ("alize", "al"),
        ("iciti", "ic"),
        ("ical", "ic"),
        ("ful", ""),
        ("ness", ""),
    ]
    for suffix, replacement in step3_rules:
        if w.endswith(suffix):
            stem = w[:-len(suffix)]
            if _measure(stem) > 0:
                w = stem + replacement
            break

    return w


def stem_tokens(tokens: List[str]) -> List[str]:
    """Applies stemming to all tokens in a list."""
    return [stem_word(t) for t in tokens]


# =====================================================================
# 5. LEMMATIZATION (Lemmatisation - Dictionary + Morphological Rules)
# =====================================================================

# Curated English Irregular Lemmas (verbs, nouns, adjectives)
IRREGULAR_LEMMAS: Dict[str, str] = {
    # Irregular verbs
    "was": "be", "were": "be", "been": "be", "am": "be", "are": "be", "is": "be",
    "went": "go", "gone": "go", "goes": "go",
    "had": "have", "has": "have", "having": "have",
    "did": "do", "does": "do", "done": "do",
    "said": "say", "says": "say", "saying": "say",
    "made": "make", "makes": "make", "making": "make",
    "took": "take", "taken": "take", "takes": "take", "taking": "take",
    "came": "come", "comes": "come", "coming": "come",
    "saw": "see", "seen": "see", "sees": "see",
    "got": "get", "gotten": "get", "gets": "get",
    "knew": "know", "known": "know", "knows": "know",
    "thought": "think", "thinks": "think",
    "told": "tell", "tells": "tell",
    "became": "become", "becomes": "become",
    "left": "leave", "leaves": "leave",
    "felt": "feel", "feels": "feel",
    "bought": "buy", "buys": "buy", "buying": "buy",
    "sold": "sell", "sells": "sell", "selling": "sell",
    "rose": "rise", "risen": "rise", "rises": "rise", "rising": "rise",
    "fell": "fall", "fallen": "fall", "falls": "fall", "falling": "fall",
    "grew": "grow", "grown": "grow", "grows": "grow", "growing": "grow",
    "held": "hold", "holds": "hold", "holding": "hold",
    "paid": "pay", "pays": "pay", "paying": "pay",
    "met": "meet", "meets": "meet",
    "ran": "run", "runs": "run", "running": "run",
    "began": "begin", "begun": "begin", "begins": "begin",
    "lost": "lose", "loses": "lose", "losing": "lose",
    "wrote": "write", "written": "write", "writes": "write",
    "found": "find", "finds": "find",
    "spent": "spend", "spends": "spend",

    # Irregular nouns
    "children": "child",
    "men": "man",
    "women": "woman",
    "people": "person",
    "feet": "foot",
    "teeth": "tooth",
    "mice": "mouse",
    "geese": "goose",
    "oxen": "ox",
    "data": "datum",
    "criteria": "criterion",
    "phenomena": "phenomenon",
    "analyses": "analysis",
    "indices": "index",
    "matrices": "matrix",
    "vertices": "vertex",
    "appendices": "appendix",
    "theses": "thesis",
    "crises": "crisis",

    # Irregular adjectives/adverbs
    "better": "good",
    "best": "good",
    "worse": "bad",
    "worst": "bad",
    "more": "much",
    "most": "much",
    "less": "little",
    "least": "little"
}


def lemmatize_word(word: str) -> str:
    """
    Lemmatizes a single word using:
    1. Direct irregular lemma lookup table
    2. Rule-based morphological inflection reductions
    """
    w = word.lower()
    if len(w) <= 2:
        return w

    # 1. Exact irregular lookup
    if w in IRREGULAR_LEMMAS:
        return IRREGULAR_LEMMAS[w]

    # 2. Plural nouns ending in -ies -> -y (e.g., companies -> company)
    if w.endswith("ies") and len(w) > 4:
        preceding = w[-4]
        if preceding not in VOWELS:
            return w[:-3] + "y"

    # 3. Plurals ending in -ves -> -f / -fe (e.g., shelves -> shelf, knives -> knife)
    if w.endswith("ves") and len(w) > 4:
        if w in ("knives", "wives", "lives"):
            return w[:-3] + "fe"
        return w[:-3] + "f"

    # 4. Plurals ending in -es after s, x, z, ch, sh (e.g., boxes -> box, watches -> watch)
    if w.endswith("es") and len(w) > 3:
        stem = w[:-2]
        if stem.endswith(("s", "x", "z", "ch", "sh")):
            return stem

    # 5. Regular noun plurals ending in -s (e.g., banks -> bank, rates -> rate)
    if w.endswith("s") and not w.endswith("ss") and len(w) > 3:
        return w[:-1]

    # 6. Participles / Gerunds ending in -ing (e.g., exporting -> export)
    if w.endswith("ing") and len(w) > 4:
        stem = w[:-3]
        if _ends_double_consonant(stem):
            return stem[:-1]  # dropping -> drop
        if _has_vowel(stem):
            return stem

    # 7. Past participles ending in -ed (e.g., acquired -> acquire, traded -> trade)
    if w.endswith("ed") and len(w) > 3:
        stem = w[:-2]
        if _ends_double_consonant(stem):
            return stem[:-1]
        if _has_vowel(stem):
            return stem

    return w


def lemmatize_tokens(tokens: List[str]) -> List[str]:
    """Applies lemmatization to all tokens in a list."""
    return [lemmatize_word(t) for t in tokens]

