// VERSION OF app.js AFTER PART 1 OF TUTORIAL
const DEBUG = true;

//set up the server
const express = require( "express" );
const logger = require("morgan");
const db = require('./db/db_connection');
const app = express();
const port = 3000;

// Configure Express to use EJS
app.set( "views",  __dirname + "/views");
app.set( "view engine", "ejs" );
 
// define middleware that logs all incoming requests
app.use(logger("dev"));

// define middleware that serves static resources in the public directory
app.use(express.static(__dirname + '/public'));

// define a route for the default home page
app.get( "/", ( req, res ) => {
    res.render('index');
} );

// define a route for the assignment list page
const read_assignments_all_sql = `
    SELECT
        assignmentId, title, priority, assignments.subjectId, subjectName,
        DATE_FORMAT(dueDate, "%m/%d/%Y (%W)") AS dueDateFormatted
    FROM 
        assignments
    JOIN subjects
        ON assignments.subjectId = subjects.subjectId
`

const read_subjects_all_sql = `
    SELECT 
        subjectId, subjectName
    FROM
        subjects
`
app.get( "/assignments", ( req, res ) => {
    db.execute(read_assignments_all_sql, (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else {
            
            db.execute(read_subjects_all_sql, (error2, results2) => {
                if (DEBUG)
                    console.log(error2 ? error2 : results2);
                if (error2)
                    res.status(500).send(error2); //Internal Server Error
                else {
                    let data = { hwlist : results, subjectlist : results2 };
                    res.render('assignments', data);
                    // data's object structure: 
                    //  { hwlist: [
                    //     {  id: __ , title: __ , priority: __ , subject: __ ,  dueDateFormatted: __ },
                    //     {  id: __ , title: __ , priority: __ , subject: __ ,  dueDateFormatted: __ },
                    //     ...],
                    //     subjectlist : [
                    //         {subjectId: ___, subjectName: ___}, ...
                    //     ]
                    //  }
                }
            })
            
            
        }
    });
});

// define a route for the assignment detail page
const read_assignment_detail_sql = `
    SELECT
        id, title, priority, subject,
        DATE_FORMAT(dueDate, "%W, %M %D %Y") AS dueDateExtended, 
        DATE_FORMAT(dueDate, "%Y-%m-%d") AS dueDateYMD, 
        description
    FROM 
        assignments
    WHERE
        id = ?
`
app.get( "/assignments/:id", ( req, res ) => {
    db.execute(read_assignment_detail_sql, [req.params.id], (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else if (results.length == 0)
            res.status(404).send(`No assignment found with id = "${req.params.id}"` ); // NOT FOUND
        else {
            let data = results[0]; // results is still an array, get first (only) element
            res.render('detail', data); 
            // data's object structure: 
            //  { id: ___ , title: ___ , priority: ___ , 
            //    subject: ___ , dueDateExtended: ___ , 
            //    dueDateYMD: ___ , description: ___ 
            //  }
        }
    });
});

// start the server
app.listen( port, () => {
    console.log(`App server listening on ${ port }. (Go to http://localhost:${ port })` );
} );