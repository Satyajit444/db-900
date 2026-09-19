# Source notes — DP-900 Episode 2: Relational Data (PDF)

19-page study pack: notes (pp. 1–2) + 100 competitive MCQs (pp. 3–15) +
answer key (pp. 16–18) + 15 open-ended scenario challenges (p. 19, NOT
imported — no options/key) + revision checklist.

## Key facts used for explanations

- Relational = tables of rows/columns + defined schema (types, constraints,
  relationships). Fits customers/orders/products/employees/finance.
- Row = one record/entity instance. Column = one attribute + data type.
- Primary key: unique, NOT NULL (e.g. CustomerID, OrderID).
- Foreign key: references a key in another table (Orders.CustomerID →
  Customers.CustomerID); enforces referential integrity.
- Cardinality: 1-1, 1-many (Customer→Orders), many-many (Students↔Courses)
  via junction/bridge table (e.g. OrderItems).
- Normalization: store facts once (Customers referenced by CustomerID);
  trade-off = more JOINs. Poor normalization → duplication/update anomalies.
- SQL: SELECT read, INSERT add, UPDATE change, DELETE remove, CREATE define,
  ALTER redefine, WHERE filter, JOIN combine, GROUP BY aggregate, ORDER BY sort.
- Objects: tables store; views = saved query as virtual table; indexes speed
  suitable reads, cost storage + write maintenance; stored procedures = saved
  SQL logic; constraints = PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK.
- Azure SQL Database = managed relational DB (minimal ops). Managed Instance
  = managed + high SQL Server compatibility (migrations). SQL Server on Azure
  VMs = full VM/OS control, most customer responsibility.
- Open source: Azure Database for PostgreSQL / MySQL — engine requirement
  drives service choice.
- Flow: choose service → provision/configure → connect securely → create /
  query / manage data.

## Answer-key quirk (important)

Option LETTERS are deliberately scrambled per question; the printed answer
key uses LINE positions (1st=A, 2nd=B, 3rd=C, 4th=D) cycling B,C,D,A — NOT
the printed letters. `relational.py` maps key→printed line→letter, so every
`correctAnswer` points at the factually correct option text (verified: all
100 correct texts are unambiguous). The PDF's "25/25/25/25" claim holds for
key letters, not printed positions.
