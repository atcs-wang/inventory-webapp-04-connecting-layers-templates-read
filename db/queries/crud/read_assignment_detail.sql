-- Read detailed values of one row from assignments table
SELECT
    id, title, priority, subject,
    DATE_FORMAT(dueDate, "%W, %M %D %Y") AS dueDateExtended, 
    DATE_FORMAT(dueDate, "%Y-%m-%d") AS dueDateYMD, 
    description
FROM 
    assignments
WHERE
    id = ?
-- For DATE_FORMAT usage see: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
