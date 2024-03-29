// VERSION OF app.js AFTER PART 2 OF TUTORIAL
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
        assignmentId, title, priority, subjectName, 
        assignments.subjectId as subjectId,
        DATE_FORMAT(dueDate, "%m/%d/%Y (%W)") AS dueDateFormatted
    FROM assignments
    JOIN subjects
        ON assignments.subjectId = subjects.subjectId
    ORDER BY assignments.assignmentId DESC
`
app.get( "/assignments", ( req, res ) => {
    db.execute(read_assignments_all_sql, (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else {
            let data = { hwlist : results };
            res.render('assignments', data);
            // What's passed to the rendered view: 
            //  hwlist: [
            //     { assignmentId: __ , title: __ , priority: __ , subjectName: __ , subjectId: __ ,  dueDateFormatted: __ },
            //     { assignmentId: __ , title: __ , priority: __ , subjectName: __ , subjectId: __ ,   dueDateFormatted: __ },
            //     ...
            //  ]
            
        }
    });
});

// define a route for the assignment detail page
const read_assignment_detail_sql = `
    SELECT
        assignmentId, title, priority, subjectName,
        assignments.subjectId as subjectId,
        DATE_FORMAT(dueDate, "%W, %M %D %Y") AS dueDateExtended, 
        DATE_FORMAT(dueDate, "%Y-%m-%d") AS dueDateYMD, 
        description
    FROM assignments
    JOIN subjects
        ON assignments.subjectId = subjects.subjectId
    WHERE assignmentId = ?
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

            let data = {hw: results[0]}; // results is still an array, get first (only) element
            res.render('detail', data); 
            // What's passed to the rendered view: 
            //  hw: {assignmentId: ___ , title: ___ , priority: ___ , 
            //    subjectName: ___ , subjectId: ___, 
            //    dueDateExtended: ___ , dueDateYMD: ___ , description: ___ 
            //  }
        }
    });
});

// start the server
app.listen( port, () => {
    console.log(`App server listening on ${ port }. (Go to http://localhost:${ port })` );
} );