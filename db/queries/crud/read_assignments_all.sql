-- Read readable summary of rows of assignments table
SELECT 
    id, title, priority, subject, 
    DATE_FORMAT(dueDate, "%m/%d/%Y (%W)") AS dueDateFormatted
FROM 
    assignments

-- For DATE_FORMAT usage see: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
