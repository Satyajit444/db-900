import random

questions = [
    {
        "question": "Which type of data is normally represented in rows and columns with a predefined schema?",
        "options": {
            "A": "Unstructured",
            "B": "Structured",
            "C": "Semi-structured",
            "D": "Streaming"
        },
        "correct": "B",
        "explanation": "Structured data follows a defined schema and is commonly stored in rows and columns.",
        "topic": "Data Types"
    },
    {
        "question": "Which is a common example of semi-structured data?",
        "options": {
            "A": "JSON",
            "B": "JPEG",
            "C": "MP4",
            "D": "A fixed SQL table"
        },
        "correct": "A",
        "explanation": "JSON contains keys, values, arrays, and nested objects, making it semi-structured.",
        "topic": "Data Types"
    },
    {
        "question": "Which is an example of unstructured data?",
        "options": {
            "A": "SQL table",
            "B": "CSV table",
            "C": "Video",
            "D": "Relational row"
        },
        "correct": "C",
        "explanation": "Video does not follow a predefined tabular schema and is unstructured data.",
        "topic": "Data Types"
    },
    {
        "question": "Which statement best describes structured data?",
        "options": {
            "A": "It has no organization",
            "B": "It follows a defined schema",
            "C": "It can only contain images",
            "D": "It must be stored in Blob Storage"
        },
        "correct": "B",
        "explanation": "Structured data is organized according to a predefined schema.",
        "topic": "Data Types"
    },
    {
        "question": "Why is JSON generally considered semi-structured?",
        "options": {
            "A": "It has no information about structure",
            "B": "It can contain keys, values, arrays, and nested objects",
            "C": "It is always stored in SQL",
            "D": "It only stores numbers"
        },
        "correct": "B",
        "explanation": "JSON has organizational features but does not require a rigid table structure.",
        "topic": "Data Types"
    },
    {
        "question": "Which format is commonly used for API responses?",
        "options": {
            "A": "JSON",
            "B": "BMP",
            "C": "MP4",
            "D": "WAV"
        },
        "correct": "A",
        "explanation": "JSON is a common text-based format used by APIs and applications.",
        "topic": "File Formats"
    },
    {
        "question": "Which format uses tags to represent hierarchical information?",
        "options": {
            "A": "XML",
            "B": "JPEG",
            "C": "Parquet",
            "D": "MP3"
        },
        "correct": "A",
        "explanation": "XML uses tags and can represent hierarchical data.",
        "topic": "File Formats"
    },
    {
        "question": "Which format is commonly associated with column-oriented analytical storage?",
        "options": {
            "A": "Parquet",
            "B": "JPEG",
            "C": "TXT",
            "D": "MP4"
        },
        "correct": "A",
        "explanation": "Parquet is a column-oriented file format commonly used in analytical workloads.",
        "topic": "File Formats"
    },
    {
        "question": "Which option is a relational database characteristic?",
        "options": {
            "A": "Tables with rows and columns",
            "B": "Only binary files",
            "C": "No schema at all",
            "D": "Only video storage"
        },
        "correct": "A",
        "explanation": "Relational databases organize data into tables with rows and columns.",
        "topic": "Databases"
    },
    {
        "question": "What is the main purpose of a database?",
        "options": {
            "A": "Only store images",
            "B": "Store, manage, and query data",
            "C": "Replace all applications",
            "D": "Compress videos"
        },
        "correct": "B",
        "explanation": "Databases provide capabilities for storing, managing, querying, and securing data.",
        "topic": "Databases"
    },
    {
        "question": "Which is an example of a transactional operation?",
        "options": {
            "A": "Calculating five-year sales trends",
            "B": "Creating a customer order",
            "C": "Building a management dashboard",
            "D": "Comparing yearly revenue"
        },
        "correct": "B",
        "explanation": "Creating a customer order is an individual business transaction.",
        "topic": "Workloads"
    },
    {
        "question": "Which is an example of an analytical operation?",
        "options": {
            "A": "Updating inventory after a sale",
            "B": "Processing a payment",
            "C": "Finding sales trends over five years",
            "D": "Creating a new user account"
        },
        "correct": "C",
        "explanation": "Finding long-term sales trends requires analysis of historical data.",
        "topic": "Workloads"
    },
    {
        "question": "OLTP is primarily associated with:",
        "options": {
            "A": "Transactional processing",
            "B": "Image processing",
            "C": "Data visualization",
            "D": "Machine learning only"
        },
        "correct": "A",
        "explanation": "OLTP means Online Transaction Processing.",
        "topic": "Workloads"
    },
    {
        "question": "OLAP is primarily associated with:",
        "options": {
            "A": "Transactional processing",
            "B": "Analytical processing",
            "C": "Password management",
            "D": "Network routing"
        },
        "correct": "B",
        "explanation": "OLAP means Online Analytical Processing.",
        "topic": "Workloads"
    },
    {
        "question": "A bank records every deposit and withdrawal. What type of workload is this?",
        "options": {
            "A": "Analytical",
            "B": "Transactional",
            "C": "Visualization",
            "D": "Unstructured"
        },
        "correct": "B",
        "explanation": "Recording deposits and withdrawals involves frequent operational transactions.",
        "topic": "Workloads"
    },
    {
        "question": "A retailer asks which product category grew fastest over the last three years. What type of workload is this?",
        "options": {
            "A": "Transactional",
            "B": "Analytical",
            "C": "Operational update",
            "D": "Authentication"
        },
        "correct": "B",
        "explanation": "The question requires historical comparison and analysis.",
        "topic": "Workloads"
    },
    {
        "question": "Which role commonly manages database availability and backup/recovery?",
        "options": {
            "A": "Data Analyst",
            "B": "DBA",
            "C": "UI Developer",
            "D": "Product Designer"
        },
        "correct": "B",
        "explanation": "A database administrator manages availability, backups, recovery, security, and performance.",
        "topic": "Roles"
    },
    {
        "question": "Which role commonly builds data pipelines?",
        "options": {
            "A": "Data Engineer",
            "B": "DBA only",
            "C": "Graphic Designer",
            "D": "End user"
        },
        "correct": "A",
        "explanation": "Data engineers build and maintain data ingestion and transformation pipelines.",
        "topic": "Roles"
    },
    {
        "question": "Which role commonly creates reports and analyzes business data?",
        "options": {
            "A": "Data Analyst",
            "B": "DBA",
            "C": "Network Engineer",
            "D": "System Administrator"
        },
        "correct": "A",
        "explanation": "Data analysts create reports, analyze data, and communicate insights.",
        "topic": "Roles"
    },
    {
        "question": "A data engineer receives files from multiple sources, transforms them, and loads them into an analytics platform. What is this primarily?",
        "options": {
            "A": "Data engineering",
            "B": "Data entry",
            "C": "Graphic design",
            "D": "Database backup"
        },
        "correct": "A",
        "explanation": "Ingesting, transforming, and loading data are data engineering activities.",
        "topic": "Roles"
    },
    {
        "question": "A DBA notices a query is slow and investigates indexes and database configuration. Which responsibility is this?",
        "options": {
            "A": "Database administration",
            "B": "Data visualization",
            "C": "Front-end development",
            "D": "Marketing"
        },
        "correct": "A",
        "explanation": "Query performance, indexes, and configuration are database administration responsibilities.",
        "topic": "Roles"
    },
    {
        "question": "A data analyst creates a dashboard showing monthly revenue by region. Which role is being performed?",
        "options": {
            "A": "Data analyst",
            "B": "DBA",
            "C": "Data center operator",
            "D": "Network administrator"
        },
        "correct": "A",
        "explanation": "Creating dashboards and analyzing revenue data are data analyst activities.",
        "topic": "Roles"
    },
    {
        "question": "Which Azure service is a relational database service?",
        "options": {
            "A": "Azure SQL Database",
            "B": "Azure Blob Storage",
            "C": "Azure Table Storage",
            "D": "Azure Storage Queue"
        },
        "correct": "A",
        "explanation": "Azure SQL Database is a managed relational database service.",
        "topic": "Azure Services"
    },
    {
        "question": "Which Azure service is commonly used for object/file-like storage of unstructured data such as images and videos?",
        "options": {
            "A": "Azure Blob Storage",
            "B": "Azure SQL Database",
            "C": "Azure SQL Managed Instance",
            "D": "Azure Database only"
        },
        "correct": "A",
        "explanation": "Azure Blob Storage is designed for large amounts of unstructured object data.",
        "topic": "Azure Services"
    },
    {
        "question": "Which Azure service is designed as a globally distributed NoSQL database?",
        "options": {
            "A": "Azure Cosmos DB",
            "B": "Azure SQL Database",
            "C": "Azure Files only",
            "D": "Power BI"
        },
        "correct": "A",
        "explanation": "Azure Cosmos DB is a globally distributed NoSQL database service.",
        "topic": "Azure Services"
    },
    {
        "question": "Which Azure service is primarily associated with analytics and large-scale data workloads?",
        "options": {
            "A": "Azure Synapse Analytics",
            "B": "Azure DNS",
            "C": "Azure Key Vault",
            "D": "Azure App Service only"
        },
        "correct": "A",
        "explanation": "Azure Synapse Analytics supports large-scale analytics and data warehousing workloads.",
        "topic": "Azure Services"
    },
    {
        "question": "Which Microsoft platform is used for business intelligence, reports, and interactive visualizations?",
        "options": {
            "A": "Power BI",
            "B": "Azure DNS",
            "C": "Azure Firewall",
            "D": "Azure Key Vault"
        },
        "correct": "A",
        "explanation": "Power BI is used to create reports, dashboards, and interactive visualizations.",
        "topic": "Azure Services"
    },
    {
        "question": "Which service is commonly associated with data integration and orchestration?",
        "options": {
            "A": "Azure Data Factory",
            "B": "Azure Front Door",
            "C": "Azure DNS",
            "D": "Azure VPN Gateway"
        },
        "correct": "A",
        "explanation": "Azure Data Factory supports data integration, movement, and orchestration.",
        "topic": "Azure Services"
    },
    {
        "question": "A photo uploaded by a customer is best classified as:",
        "options": {
            "A": "Structured",
            "B": "Semi-structured",
            "C": "Unstructured",
            "D": "Relational"
        },
        "correct": "C",
        "explanation": "A photo does not follow a predefined table or document schema.",
        "topic": "Data Types"
    },
    {
        "question": "A JSON customer profile containing nested addresses and arrays is best classified as:",
        "options": {
            "A": "Structured",
            "B": "Semi-structured",
            "C": "Unstructured",
            "D": "Binary-only"
        },
        "correct": "B",
        "explanation": "JSON uses keys, values, arrays, and nested objects but does not require a rigid table.",
        "topic": "Data Types"
    },
    {
        "question": "A table with CustomerID, Name, Email, and City is:",
        "options": {
            "A": "Structured",
            "B": "Unstructured",
            "C": "Audio",
            "D": "Streaming"
        },
        "correct": "A",
        "explanation": "A table with defined columns and rows is structured data.",
        "topic": "Data Types"
    },
    {
        "question": "Which scenario most strongly indicates OLTP?",
        "options": {
            "A": "Thousands of small order transactions per minute",
            "B": "Five-year trend analysis",
            "C": "Executive dashboard",
            "D": "Historical data mining"
        },
        "correct": "A",
        "explanation": "OLTP is designed for frequent, small, operational transactions.",
        "topic": "Workloads"
    },
    {
        "question": "Which scenario most strongly indicates OLAP?",
        "options": {
            "A": "Updating one order",
            "B": "Recording a payment",
            "C": "Aggregating years of sales data",
            "D": "Creating a new account"
        },
        "correct": "C",
        "explanation": "Aggregating historical sales data is an analytical OLAP workload.",
        "topic": "Workloads"
    },
    {
        "question": "Why can analytical queries be expensive?",
        "options": {
            "A": "They may scan and aggregate large amounts of data",
            "B": "They always contain images",
            "C": "They never use indexes",
            "D": "They only process one row"
        },
        "correct": "A",
        "explanation": "Analytical queries often scan, join, and aggregate large datasets.",
        "topic": "Workloads"
    },
    {
        "question": "Which statement about transactional workloads is generally true?",
        "options": {
            "A": "They commonly involve frequent reads and writes",
            "B": "They only contain historical data",
            "C": "They are only used for dashboards",
            "D": "They cannot have concurrent users"
        },
        "correct": "A",
        "explanation": "Transactional systems commonly process frequent reads and writes from concurrent users.",
        "topic": "Workloads"
    },
    {
        "question": "Which statement about analytical workloads is generally true?",
        "options": {
            "A": "They are focused on insights and analysis",
            "B": "They only insert single rows",
            "C": "They cannot use historical data",
            "D": "They are limited to payment processing"
        },
        "correct": "A",
        "explanation": "Analytical workloads examine data to identify trends, patterns, and insights.",
        "topic": "Workloads"
    },
    {
        "question": "A food delivery application creates an order, charges the customer, and updates order status. This is primarily:",
        "options": {
            "A": "Transactional",
            "B": "Analytical",
            "C": "Unstructured",
            "D": "Visualization"
        },
        "correct": "A",
        "explanation": "Creating orders, processing payments, and updating statuses are transactions.",
        "topic": "Workloads"
    },
    {
        "question": "The same company analyzes delivery times by city for the last 24 months. This is primarily:",
        "options": {
            "A": "Transactional",
            "B": "Analytical",
            "C": "Authentication",
            "D": "File compression"
        },
        "correct": "B",
        "explanation": "Analyzing historical delivery times is an analytical workload.",
        "topic": "Workloads"
    },
    {
        "question": "Which pairing is correct?",
        "options": {
            "A": "DBA → manages databases",
            "B": "Data Analyst → repairs servers",
            "C": "Data Engineer → designs logos",
            "D": "Data Analyst → configures routers"
        },
        "correct": "A",
        "explanation": "A DBA manages database systems and their availability, security, and performance.",
        "topic": "Roles"
    },
    {
        "question": "Which pairing is correct?",
        "options": {
            "A": "Data Engineer → data pipelines",
            "B": "DBA → marketing campaigns",
            "C": "Data Analyst → network cabling",
            "D": "DBA → product photography"
        },
        "correct": "A",
        "explanation": "Data engineers build and maintain data pipelines.",
        "topic": "Roles"
    },
    {
        "question": "Which pairing is correct?",
        "options": {
            "A": "Data Analyst → insights and reports",
            "B": "Data Engineer → only manual data entry",
            "C": "DBA → social media management",
            "D": "Analyst → physical server repair"
        },
        "correct": "A",
        "explanation": "Data analysts use data to create reports and communicate insights.",
        "topic": "Roles"
    },
    {
        "question": "Which Azure service would be more appropriate for storing large numbers of image files?",
        "options": {
            "A": "Azure Blob Storage",
            "B": "Azure SQL Database",
            "C": "Azure SQL Managed Instance",
            "D": "Power BI"
        },
        "correct": "A",
        "explanation": "Azure Blob Storage is suitable for large numbers of image files.",
        "topic": "Azure Services"
    },
    {
        "question": "Which Azure service would be more appropriate for a relational application database?",
        "options": {
            "A": "Azure SQL Database",
            "B": "Azure Blob Storage",
            "C": "Power BI",
            "D": "Azure Data Factory"
        },
        "correct": "A",
        "explanation": "Azure SQL Database is a relational database service for applications.",
        "topic": "Azure Services"
    },
    {
        "question": "Which statement best distinguishes files from databases?",
        "options": {
            "A": "Databases generally provide data management and querying capabilities beyond simple file storage",
            "B": "Files cannot contain data",
            "C": "Databases can only store images",
            "D": "Files always require SQL"
        },
        "correct": "A",
        "explanation": "Databases add capabilities such as querying, indexing, transactions, security, and recovery.",
        "topic": "Databases"
    },
    {
        "question": "A CSV file containing sales records is best described as:",
        "options": {
            "A": "A file containing structured/tabular data",
            "B": "An unstructured video",
            "C": "A relational database",
            "D": "A NoSQL database"
        },
        "correct": "A",
        "explanation": "CSV files commonly contain structured, tabular data, although a CSV file is not itself a database.",
        "topic": "File Formats"
    },
    {
        "question": "Which of these is NOT normally considered unstructured data?",
        "options": {
            "A": "Video",
            "B": "Audio",
            "C": "JPEG image",
            "D": "SQL table"
        },
        "correct": "D",
        "explanation": "An SQL table is structured data.",
        "topic": "Data Types"
    },
    {
        "question": "Which of these is NOT normally considered semi-structured?",
        "options": {
            "A": "JSON",
            "B": "XML",
            "C": "Relational SQL table",
            "D": "Document-style data"
        },
        "correct": "C",
        "explanation": "A relational SQL table is structured data, not semi-structured data.",
        "topic": "Data Types"
    },
    {
        "question": "Which question is analytical?",
        "options": {
            "A": "What was total revenue by region last year?",
            "B": "Create order #10025",
            "C": "Update a customer's phone number",
            "D": "Process a payment"
        },
        "correct": "A",
        "explanation": "Revenue by region for a previous year requires analysis and aggregation.",
        "topic": "Workloads"
    },
    {
        "question": "Which question is transactional?",
        "options": {
            "A": "Which region grew fastest?",
            "B": "Create a new order for customer 1001",
            "C": "What is the five-year trend?",
            "D": "Which product has the highest lifetime revenue?"
        },
        "correct": "B",
        "explanation": "Creating a new order is an operational transaction.",
        "topic": "Workloads"
    },
    {
        "question": "Why might an organization separate operational and analytical systems?",
        "options": {
            "A": "Their workloads have different access patterns and requirements",
            "B": "Data can never be copied",
            "C": "Analytical systems cannot store data",
            "D": "Transactional systems cannot use databases"
        },
        "correct": "A",
        "explanation": "Operational systems handle transactions, while analytical systems are optimized for large queries and aggregations.",
        "topic": "Workloads"
    }
]

def shuffle_options(q):
    original_correct_letter = q["correct"]
    original_correct_text = q["options"][original_correct_letter]

    items = list(q["options"].items())
    random.shuffle(items)

    new_options = {}
    correct_letter = None
    letters = ["A", "B", "C", "D"]

    for i, (old_letter, text) in enumerate(items):
        new_letter = letters[i]
        new_options[new_letter] = text
        if text == original_correct_text:
            correct_letter = new_letter

    return new_options, correct_letter

def run_quiz():
    random.shuffle(questions)

    score = 0
    total = len(questions)
    topic_results = {}

    print("=" * 60)
    print("DP-900 Section 1: Core Data Concepts – Interactive Quiz")
    print("=" * 60)
    print("Instructions:")
    print("- For each question, type A, B, C, or D and press Enter.")
    print("- You’ll see if your answer is correct or incorrect, plus a short explanation.")
    print("=" * 60)
    print()

    for i, q in enumerate(questions, start=1):
        topic = q.get("topic", "Other")
        if topic not in topic_results:
            topic_results[topic] = {"correct": 0, "total": 0}

        topic_results[topic]["total"] += 1

        shuffled_options, correct_letter = shuffle_options(q)

        print(f"Question {i} of {total}")
        print(q["question"])
        for opt_key, opt_text in shuffled_options.items():
            print(f"  {opt_key}. {opt_text}")

        while True:
            user_ans = input("\nYour answer (A/B/C/D): ").strip().upper()
            if user_ans in ["A", "B", "C", "D"]:
                break
            print("Invalid input. Please enter A, B, C, or D.")

        if user_ans == correct_letter:
            print("\n[OK] Correct!")
            score += 1
            topic_results[topic]["correct"] += 1
        else:
            print(f"\n[WRONG] Incorrect. The correct answer is {correct_letter}.")

        print(f"Explanation: {q['explanation']}")
        print("-" * 60)
        print()

    print("=" * 60)
    print("TOTAL RESULT")
    print("=" * 60)
    print(f"Total questions:        {total}")
    print(f"Correct answers:        {score}")
    print(f"Incorrect answers:      {total - score}")
    percentage = (score / total) * 100
    print(f"Percentage:             {percentage:.1f}%")

    if percentage >= 90:
        print("Performance:              Excellent understanding of Section 1.")
    elif percentage >= 75:
        print("Performance:              Good preparation; review weaker topics.")
    elif percentage >= 60:
        print("Performance:              Moderate understanding; revise data stores and workloads.")
    else:
        print("Performance:              Review structured vs unstructured data, OLTP/OLAP, batch/streaming, and data roles.")

    print()
    print("BREAKDOWN BY TOPIC")
    print("-" * 60)

    for topic, res in topic_results.items():
        t_total = res["total"]
        t_correct = res["correct"]
        t_pct = (t_correct / t_total * 100) if t_total > 0 else 0
        print(f"{topic:20} | Correct: {t_correct:2}/{t_total:2} | {t_pct:5.1f}%")

    print("=" * 60)

if __name__ == "__main__":
    run_quiz()