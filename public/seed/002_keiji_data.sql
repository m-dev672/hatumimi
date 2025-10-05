CREATE TABLE keiji_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keijitype INTEGER NOT NULL,
    genrecd INTEGER NOT NULL,
    seqNo TEXT NOT NULL,
    genre_name VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    published_at DATETIME,
    display_start DATETIME,
    display_end DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(keijitype, genrecd, seqNo)
);