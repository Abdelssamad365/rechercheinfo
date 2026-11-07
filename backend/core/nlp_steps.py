"""From-scratch NLP preprocessing steps for Information Retrieval.

Implemented without external NLP packages (no NLTK, spaCy, or regex `re`).
Each stage is written as a small, self-contained function for clear explanation:
  1. Tag Cleaning       — character state-machine + SGML entity decoding
  2. Normalisation      — lowercasing, punctuation removal, tokenization
  3. Stopwords Removal  — O(1) hash-set filtering
  4. Stemming           — rule-based Porter suffix stripping
  5. Lemmatization      — irregular dictionary + morphological inflection rules
"""

from typing import Dict, List, Set, Tuple
from .parser import decode_sgml_entities


# ============================================================================
# 1. TAG CLEANING (Nettoyage des balises SGML / XML)
# ============================================================================

def clean_tags(text: str) -> str:
    """Strips `<...>` markup via a character state machine and decodes SGML entities."""
    characters: List[str] = []
    inside_tag = False

    for ch in text:
        if ch == "<":
            inside_tag = True
            characters.append(" ")  # Prevent words on either side of a tag from merging
        elif ch == ">":
            inside_tag = False
        elif not inside_tag:
            characters.append(ch)

    without_tags = "".join(characters)
    decoded = decode_sgml_entities(without_tags)
    return " ".join(decoded.split())


# ============================================================================
# 2. NORMALISATION & TOKENIZATION (Minuscules, ponctuation, découpage)
# ============================================================================

PUNCTUATION_CHARS: Set[str] = set(
    """!"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~§°«»“”‘’•—–…"""
)


def normalize_text(text: str) -> str:
    """Lowercases text, replaces punctuation with spaces, and collapses whitespace."""
    cleaned: List[str] = []
    for ch in text.lower():
        if ch in PUNCTUATION_CHARS or ch.isspace():
            cleaned.append(" ")
        else:
            cleaned.append(ch)

    return " ".join("".join(cleaned).split())


def tokenize(text: str) -> List[str]:
    """Splits text on whitespace and keeps tokens containing alphanumeric characters."""
    tokens: List[str] = []
    for raw_token in text.split():
        if any(ch.isalnum() for ch in raw_token):
            tokens.append(raw_token)
    return tokens


# ============================================================================
# 3. STOPWORDS REMOVAL (Suppression des mots-vides)
# ============================================================================

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
    "yourself", "yourselves",
}


def remove_stopwords(
    tokens: List[str],
    stopwords_set: Set[str] = DEFAULT_STOPWORDS,
) -> List[str]:
    """Removes functional English stopwords in O(1) lookup time per token."""
    return [token for token in tokens if token not in stopwords_set]


# ============================================================================
# 4. STEMMING (Racinisation — Porter-style Suffix Stripping)
# ============================================================================

VOWELS: Set[str] = {"a", "e", "i", "o", "u"}

STEP2_SUFFIXES: List[Tuple[str, str]] = [
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

STEP3_SUFFIXES: List[Tuple[str, str]] = [
    ("icate", "ic"),
    ("ative", ""),
    ("alize", "al"),
    ("iciti", "ic"),
    ("ical", "ic"),
    ("ful", ""),
    ("ness", ""),
]


def _is_consonant(word: str, index: int) -> bool:
    """Returns True if `word[index]` is a consonant (treating 'y' contextually)."""
    ch = word[index]
    if ch in VOWELS:
        return False
    if ch == "y":
        return True if index == 0 else not _is_consonant(word, index - 1)
    return True


def _measure(word: str) -> int:
    """Computes Porter syllable measure `m` for `[C](VC)^m[V]`."""
    n = len(word)
    i = 0
    m = 0

    while i < n and _is_consonant(word, i):
        i += 1

    while i < n:
        while i < n and not _is_consonant(word, i):
            i += 1
        if i >= n:
            break
        while i < n and _is_consonant(word, i):
            i += 1
        m += 1

    return m


def _has_vowel(stem: str) -> bool:
    """Returns True if `stem` contains at least one vowel."""
    return any(not _is_consonant(stem, i) for i in range(len(stem)))


def _ends_double_consonant(word: str) -> bool:
    """Returns True if `word` ends with two identical consonants (e.g. 'tt', 'pp')."""
    return len(word) >= 2 and word[-1] == word[-2] and _is_consonant(word, len(word) - 1)


def _ends_cvc(word: str) -> bool:
    """Returns True if `word` ends with Consonant-Vowel-Consonant (excluding w, x, y)."""
    if len(word) < 3:
        return False
    is_cvc = (
        _is_consonant(word, len(word) - 3)
        and not _is_consonant(word, len(word) - 2)
        and _is_consonant(word, len(word) - 1)
    )
    return is_cvc and word[-1] not in ("w", "x", "y")


def _cleanup_ed_ing_stem(stem: str) -> str:
    """Restores silent 'e' or trims double consonants after stripping '-ed' or '-ing'."""
    if stem.endswith(("at", "bl", "iz")):
        return stem + "e"
    if _ends_double_consonant(stem) and not stem.endswith(("l", "s", "z")):
        return stem[:-1]
    if _measure(stem) == 1 and _ends_cvc(stem):
        return stem + "e"
    return stem


def _apply_suffix_rules(word: str, rules: List[Tuple[str, str]]) -> str:
    """Applies the first matching `(suffix, replacement)` rule when `measure(stem) > 0`."""
    for suffix, replacement in rules:
        if word.endswith(suffix):
            stem = word[: -len(suffix)]
            if _measure(stem) > 0:
                return stem + replacement
            break
    return word


def stem_word(word: str) -> str:
    """Reduces an English word to its root stem using Porter suffix-stripping rules."""
    if len(word) <= 2:
        return word

    w = word.lower()

    # Step 1a: Plurals (-sses, -ies, -s)
    if w.endswith("sses") or w.endswith("ies"):
        w = w[:-2]
    elif w.endswith("s") and not w.endswith("ss"):
        w = w[:-1]

    # Step 1b: Past & progressive suffixes (-eed, -ed, -ing)
    if w.endswith("eed"):
        stem = w[:-3]
        if _measure(stem) > 0:
            w = stem + "ee"
    elif w.endswith("ed") and _has_vowel(w[:-2]):
        w = _cleanup_ed_ing_stem(w[:-2])
    elif w.endswith("ing") and _has_vowel(w[:-3]):
        w = _cleanup_ed_ing_stem(w[:-3])

    # Step 1c: Terminal 'y' -> 'i' when stem has a vowel
    if w.endswith("y") and _has_vowel(w[:-1]):
        w = w[:-1] + "i"

    # Steps 2 & 3: Derivational suffixes
    w = _apply_suffix_rules(w, STEP2_SUFFIXES)
    w = _apply_suffix_rules(w, STEP3_SUFFIXES)

    return w


def stem_tokens(tokens: List[str]) -> List[str]:
    """Applies Porter stemming to every token in `tokens`."""
    return [stem_word(token) for token in tokens]


# ============================================================================
# 5. LEMMATIZATION (Lemmatisation — Irregular Dictionary + Morphology)
# ============================================================================

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
    # Irregular plural nouns
    "children": "child", "men": "man", "women": "woman", "people": "person",
    "feet": "foot", "teeth": "tooth", "mice": "mouse", "geese": "goose",
    "oxen": "ox", "data": "datum", "criteria": "criterion",
    "phenomena": "phenomenon", "analyses": "analysis", "indices": "index",
    "matrices": "matrix", "vertices": "vertex", "appendices": "appendix",
    "theses": "thesis", "crises": "crisis",
    # Irregular comparatives & superlatives
    "better": "good", "best": "good",
    "worse": "bad", "worst": "bad",
    "more": "much", "most": "much",
    "less": "little", "least": "little",
}


def lemmatize_word(word: str) -> str:
    """Maps an English word to its canonical dictionary lemma."""
    w = word.lower()
    if len(w) <= 2:
        return w

    # 1. Exact lookup for irregular verbs, nouns, and adjectives
    if w in IRREGULAR_LEMMAS:
        return IRREGULAR_LEMMAS[w]

    # 2. Plurals ending in consonant + 'ies' -> 'y' (companies -> company)
    if w.endswith("ies") and len(w) > 4 and w[-4] not in VOWELS:
        return w[:-3] + "y"

    # 3. Plurals ending in '-ves' -> '-f' or '-fe' (shelves -> shelf, knives -> knife)
    if w.endswith("ves") and len(w) > 4:
        return w[:-3] + ("fe" if w in ("knives", "wives", "lives") else "f")

    # 4. Sibilant plurals ending in '-es' (boxes -> box, watches -> watch)
    if w.endswith("es") and len(w) > 3 and w[:-2].endswith(("s", "x", "z", "ch", "sh")):
        return w[:-2]

    # 5. Regular noun plurals ending in '-s' (banks -> bank)
    if w.endswith("s") and not w.endswith("ss") and len(w) > 3:
        return w[:-1]

    # 6. Gerunds / participles ending in '-ing' or '-ed'
    for suffix, min_len in (("ing", 4), ("ed", 3)):
        if w.endswith(suffix) and len(w) > min_len:
            stem = w[: -len(suffix)]
            if _ends_double_consonant(stem):
                return stem[:-1]
            if _has_vowel(stem):
                return stem

    return w


def lemmatize_tokens(tokens: List[str]) -> List[str]:
    """Applies morphological lemmatization to every token in `tokens`."""
    return [lemmatize_word(token) for token in tokens]
