//set up the server
const express = require( "express" );
const logger = require("morgan");
const app = express();
const port = 8080;
const db = require("./db/db_connection");

// Configure Express to use EJS
app.set( "views",  __dirname + "/views");
app.set( "view engine", "ejs" );

// define middleware that logs all incoming requests
app.use(logger("dev"));

// define middleware that serves static resources in the public directory
app.use(express.static(__dirname + '/public'));
// define a route for the default home page
app.get( "/", ( req, res ) => {
    res.render("index");
} );

const read_stuff_all_sql = `
    SELECT 
        id, item, quantity
    FROM
        stuff
`

// define a route for the stuff inventory page
app.get( "/stuff", ( req, res ) => {
    db.execute(read_stuff_all_sql, (error, results) => {
        if (error) {
            res.status(500).send(error); // Internal Server Error
        } else {
            res.render('stuff', {inventory : results })
        }
    });
} );

const read_item_sql = `
    SELECT 
        item, quantity, description
    FROM
        stuff
    WHERE 
        id = ?    
`
// define a route for the item detail page
app.get( "/stuff/item/:id", ( req, res ) => {
    db.execute(read_item_sql, [req.params.id], (error, results) => {
        if (error) {
            res.status(500).send(error); // Internal Server Error
        } else if (results.length == 0) {
            res.status(404).send(`No item found with id = '${req.params.id}'`);
        }
        else {
            let data = results[0];
            //data = {item: ____, quantity: ____, description: ____ }
            res.render('item', data);
        }
    });

} );

// start the server
app.listen( port, () => {
    console.log(`App server listening on ${ port }. (Go to http://localhost:${ port })` );
} );