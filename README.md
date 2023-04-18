# Part 04: Connecting the Layers: Rendering templates with data

This tutorial follows after:
[Part 03: Database Layer: Database connection and first table set-up](https://github.com/atcs-wang/inventory-webapp-03-db-connection-setup/)

Technologies: [EJS (Embedded JavaScript templating)](https://ejs.co/)

In this tutorial, we will connect all three layers, making our server render the web app's pages with data from the database. 

## (4.0) Auto-restart our server when code changes with `nodemon`:

During development, we have started our app server with this command:
```
>node app.js
```

When we deploy our application, we will pretty much start the server just once (and restart the server whenever it crashes).

However, during development, we frequently have to manually stop (Ctrl-C) and re-start our server whenever we made a change to our code. This is a bit of a pain.

Instead of manually restarting, we can use an npm package called `nodemon` - a tool that helps develop Node applications by automatically restarting the node application when file changes in the directory are detected.

> If you like, check out the [npm documentation for nodemon](https://www.npmjs.com/package/nodemon):


First, we need to install `nodemon`. Run this in your terminal:

```
> npm install nodemon --save-dev
```
> The `--save-dev` flag will cause `package.json` to mark nodemon as a **development dependency** - something that a deployed "production" server doesn't need to install.

Notice the new content in the `package.json` file:
```json 
  "devDependencies": {
    "nodemon": "^2.0.16" //version number may vary
  }
```

We added `--save-dev` to install it as a development-only dependency, because it is not needed when we deploy. 

Now, you can use it like this:
```
> npx nodemon app.js
```

While nodemon runs, any changes to `.js` files will automatically restart the server. 

> You can manually restart by entering `rs` into the Terminal while `nodemon` is running.

> You can also still (and should) shut down the server when you're done with `Ctrl-C` 

However, changes to files with extensions of `.sql`, `.env`, and `.ejs` (these are coming!) also warrant restarts. To have nodemon monitor files with other extensions, the `-e` flag can be used:

```
> npx nodemon -e js,ejs,sql,env app.js
```

Of course, that's a handful to type out all the time. Read the next section for a shortcut!

### (4.0.1) `npm` scripts for convenience

The Node environment allows us to define **custom scripts** - short aliases for commonly used commands - in the `package.json` file, and run them via `npm run scriptname`.

Anytime you have a common command or series of commands, creating an npm script can make it more convenient, and documents it.


Find the `"scripts"` section of `package.json`:
```json
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

and replace it with this:

```json
  "scripts": {
    "start": "node app.js", 
    "devstart": "nodemon -e js,ejs,sql,env app.js", 
    "dbcreate": "node db/db_create.js",
    "dbsample": "node db/db_insert_sample_data.js",
    "dbprint": "node db/db_print.js",
    "devstart-fresh": "npm-run-all dbcreate dbsample dbprint devstart" 
   },
```

Now, you can run either of these scripts to start your server:
```
> npm run start             //start the server
> npm run devstart          //start the server with nodemon, updating on code change
```

Going forward, you'll probably prefer `npm run devstart` for most of your development needs. 

> Note: `npm start` can also be used in place of `npm run start`. All the other scripts require the full "`npm run ____`" but `npm start` is a special command. Most cloud deployment services use `npm start` to start your server, so defining this now gets us ready for future deployment.

The other `npm` scripts are convenient shortcuts for our database scripts we wrote in the last tutorial. 

```
> npm run dbcreate          //drop and (re)-create database tables  
> npm run dbsample          //delete and (re)-insert sample data in database
> npm run dbprint           //print contents of tables in database
> npm run devstart-fresh    //run the 3 above scripts, then devstart
```

The last script `devstart-fresh` utilizes npm package `npm-run-all` to run multiple other scripts. Before we can use it, we must install `npm-run-all`:

```
> npm install npm-run-all
```

Now try it:
```
> npm run devstart-fresh
```

This will *first* re-initialize the database tables, insert sample data, print database contents, *then* start the server, restarting on file change. Ideal for a fresh development session!

Going forward, you can start using `npm run devstart` instead of `node app.js ` for most of your development needs. The other `npm` scripts are (for now) just for convenience. 

## (4.1) The big picture:

[Two tutorials ago](https://github.com/atcs-wang/inventory-webapp-02-app-server-basics#making-a-simple-app-server-for-our-prototypes), we set up "routes" in `app.js` telling our Express web server to handle incoming HTTP requests from client browsers, and respond with static HTML files or other static resources. 

>```
>Browser --- request ---> App Server
>Browser <-- response --- App Server
>```

[Last tutorial](https://github.com/atcs-wang/inventory-webapp-03-db-connection-setup#read-the-table-step-44), we used NodeJS to connect and execute queries to our MySQL database, and the database would return data back. 

>```
>App Server --- query --> Database
>App Server <-- data ---- Database
>```


We will now combine those two concepts into a web server that responds to HTTP requests in a way that depends on the current state of the database. 
This kind of server generally follows the following pattern: 
1. The web server receives an HTTP request
2. The web server makes a relevant query to the database
3. The web server waits for the data to be returned
4. The web server uses the data to form and send the HTTP response. 

>```
> Browser --- request ---> App Server
>                          App Server --- query --> Database
>                          App Server <-- data ---- Database
> Browser <-- response --- App Server
>```

There are a variety of formats the response might take: it could be raw data from the database (e.g. plaintext or JSON) or fully formed HTML pages based on data. Such database-driven HTML pages are considered ***dynamic***, rather than static. 

Making our webapp dynamic is a big step, conceptually. Rather than making the leap to the final code in one go, we'll break down the process and understanding into 2 main parts.

1. In PART 1 of the tutorial, we'll first focus on making our server query the database upon HTTP request, receive the data from the database, and then respond with that raw data.  (You can see the state of `app.js` at the end of this part in `app-part1.js`)

2. In PART 2 of the tutorial, we'll upgrade the server's response from raw data to **dynamically rendered HTML pages**  - that is, HTML that *contains* that data. (`app.js` has the final code from the end of this part)

### (4.1.1) Setting "DEBUG" mode

As the server gets more complex, it can become difficult to understand what's going on- and even harder to debug!
Before we begin developing in earnest, we're going to set up a "`DEBUG`" mode for ourselves. 

Add this line to the top of your `app.js`:

```js
const DEBUG = true;
```

As we go, we will sprinkle in some extra logging statements that can be helpful for both understanding and debugging the code, but that will only run when `DEBUG` is true.

You may find the output too verbose to see constantly, so at any point change this line to set `DEBUG = false` to disable the extra logging (and back to `true` when you need it again!). 

## (4.2) Responding with raw data (JSON) [PART 1] : 

Before we can execute any database queries, we need `app.js` to `require()` the connection object we defined in `db/db_connection.js`. Add this line to the top of the file with the other `require` statements.

```js
const db = require('./db/db_connection');
```

### (4.2.1) Making the `/assignments` route respond with data
Currently the `/assignments` route looks like this:

```js
app.get( "/assignments", ( req, res ) => {
    res.sendFile( __dirname + "/views/assignments.html" );
} );
```
As it is, requests for `/assignments` are immediately responded to with the `assignments.html` prototype. 

The client is ostensibly interested in seeing a summary list of all rows in the `'assignments'` table in the database. This means the app server will need to execute an SQL query upon receiving a request. 

We might execute something like this to get the data we'd like to see on the `/assignments` page:

```sql
    SELECT 
        assignmentId, title, priority, subjectName, 
        assignments.subjectId as subjectId,
        DATE_FORMAT(dueDate, "%m/%d/%Y (%W)") AS dueDateFormatted
    FROM assignments
    JOIN subjects
        ON assignments.subjectId = subjects.subjectId
    ORDER BY assignments.assignmentId DESC
```
*(also in `db/queries/crud/read_assignments_all.sql`)*

> We executed a similar query in `db/db_print.js` in the last tutorial. The query above differs in a couple of ways:  
> - the specific columns being selected, rather than using `SELECT *` to get all columns. Notice the `subjectId` and `description` columns are left out.
> - the `DATE_FORMAT` SQL function (read the (DATE_FORMAT documentation here)[https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format]), used to format the dueDate column a certain way
> - the use of `AS` to rename ("alias") the result of both `assignments.subjectId` as just `subjectId`, and the result of the `DATE_FORMAT` function as `dueDateFormatted`
> - the ordering of the data by `assignmentId DESC`; this puts the most recently created entries at the top.

Replace the code for the `/assignments` route with this code instead:
```js
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
        else
            res.send(results);
    });
});
```

and visit `localhost:3000/assignments` on your browser. Now, instead of an HTML page, you should see some plaintext with JSON-style data from the database, similar to this: 

```json
[
  {
    assignmentId: 7,
    title: 'Watch WWII docuseries on PBS',
    priority: null,
    subjectName: 'History',
    subjectId: 6,
    dueDateFormatted: null
  },
  {
    assignmentId: 6,
    title: 'Cell Function Research Paper',
    priority: null,
    subjectName: 'Biology',
    subjectId: 5,
    dueDateFormatted: '06/06/2023 (Tuesday)'
  },
  {
    assignmentId: 5,
    title: 'Practice!',
    priority: 1,
    subjectName: 'Music',
    subjectId: 4,
    dueDateFormatted: null
  },
  {
    assignmentId: 4,
    title: 'Recursion Lab',
    priority: 7,
    subjectName: 'Comp Sci',
    subjectId: 1,
    dueDateFormatted: '05/23/2023 (Tuesday)'
  },
  {
    assignmentId: 3,
    title: 'Web App Project',
    priority: 5,
    subjectName: 'Comp Sci',
    subjectId: 1,
    dueDateFormatted: '06/07/2023 (Wednesday)'
  },
  {
    assignmentId: 2,
    title: 'Long Form Essay',
    priority: 8,
    subjectName: 'Language',
    subjectId: 3,
    dueDateFormatted: '06/01/2023 (Thursday)'
  },
  {
    assignmentId: 1,
    title: 'Textbook Exercises',
    priority: 10,
    subjectName: 'Math',
    subjectId: 2,
    dueDateFormatted: '05/26/2023 (Friday)'
  }
]
```
> If `DEBUG` is `true`, you'll also see it printed in your console. It'll be nicely formatted in the console, but probably not so much on your browser.

Great! **This is a big step that's important to understand.** Let's break down the new code:

- **When does the app server respond now?** The route handler doesn't send a response right away anymore - first, it sends a query to the database, then waits for the query results via another *nested* handler callback function before responding. (Nested callback functions can be a bit disorienting at first.) 
- **How does the server know if the database executed the query successfully?**  Our database might be respond too slowly or fail to execute the query for a wide range of reasons (e.g. malformed SQL, network failure, database is busy/slow). The opening `if (error)` statement in the callback function is the standard way of checking this. In case of failure, the `error` parameter in the callback function will be some kind of error message object (a "truthy" value). Otherwise, `error` will be `undefined` (a "falsy" value). 
- **If the database does NOT return results successfully?** Our response should have an appropriate status code of `500 Internal Server Error`. It can be helpful (at least during development) to also report what went wrong, so we can send the error object too. The `res.status(500).send(error)` in the if block accomplishes this.
- **Otherwise, if the database DOES return results successfully?**  In the else block, `res.send(results)` will send a response with a default `200 OK` status code and a body containing the `results` serialized as JSON (JavaScript Object Notation). 

> If you'd like to see the error message response, temporarily alter your SQL query to have some kind of syntax error. Check both the server logs in the terminal and the browser's developer tools (Inspect -> Network) to confirm that the status code is indeed `500 Internal Server Error`.

### 4.2.2 Making the `/assignments/detail` route respond with data

Currently the `/assignments/detail` route looks like this:

```js
app.get( "/assignments/detail", ( req, res ) => {
    res.sendFile( __dirname + "/views/detail.html" );
} );
```

As it is, requests for `/assignments/detail` are immediately responded to with the `detail.html` prototype. 

The client is interested in details about a *particular* row in the assignments table. This could be any assignment, which are uniquely identified by the column `id`. 

This means the app server will need to execute something like following SQL query upon request: 

```sql
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
```
*(also in `db/queries/crud/read_assignment_detail.sql`)*

where the `?` placeholder must be filled in with the appropriate `assignmentId` value.

> Note also that the `dueDate` is being formatted and aliased two different ways - `dueDateExtended` is a very "human" way to write/read dates, and `dueDateYMD` is the date formatted like `yyyy-mm-dd` - as both MySQL and HTML date `<input>` elements use internally. We will use both later.

#### (4.2.2.1) Prepared statements with manual values

Let's assume for a minute (as the prototype does) that the client wants to view the first assignment in the table, with `id = 1`.

Replace the code for the `/assignments/detail` route with this code instead:
```js
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
app.get( "/assignments/detail", ( req, res ) => {
    db.execute(read_assignment_detail_sql, [1], (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else
            res.send(results[0]); // results is still an array
    });
});
```

If you navigate your browser to `localhost:3000/assignments/detail`, you should receive data like this:
```json
  {
    assignmentId: 1,
    title: 'Textbook Exercises',
    priority: 10,
    subjectName: 'Math',
    subjectId: 2,
    dueDateExtended: 'Friday, May 26th 2023',
    dueDateYMD: '2023-05-26',
    description: 'Do odd questions in the range #155 - #207 (chapter 11). Remember to show your work!'
  }
```
> Again, not that nicely formatted in the browser, but `DEBUG` will cause `results`to also print nicely into your console (though also with `[ ]` since the `results` is an array).

Notice the route handler is very similar (for now) to the `/assignments` route from earlier. The only differences are:

1. To assign `?` placeholders in SQL statements, a second parameter is passed to `db.execute()`: an array containing values for each `?` to replace.  In this case, there is only one `?` placeholder, and the array contains just a single value: `1`.  This "replace-the-placeholder" technique is known as a **prepared statement**, and was demonstrated in `db/db_insert_sample_data.js` in the previous tutorial. (There is more discussion about prepared statements and why they are used below...) 
2. Results for a `SELECT` statement are always arrays, even if only one row is selected. The response here only needs to send the element in the first index of the results, not the entire results array. (Of course, if no such element exists, an `undefined` will be sent instead! We'll also address this more below.. )


#### (4.2.2.2) URL parameters - allowing the client to specify prepared statement values.

Naturally, the client would like to see data for any of the assignments in the table, not just the one with `id = 1`. How can the client specify which assignment `id` they want? 

Imagine a route system where the information for assignment with `id=1` is at the URL path `assignments/1`, assignment with `id=2` is at `assignments/2`, and so on so forth. We call that `id` number embedded in the URL a **URL parameter**, and Express has a very easy way to access them.

Let's change the route path from
```js
app.get( "/assignments/detail", ...
```
to 
```js
app.get( "/assignments/:id",
```

The `:id` part declares a URL parameter `id`. This makes the route apply to *any* URL path of the pattern `/assignments/:id`, where `:id` can be any (non-blank) value. 

> NOTE: There is no limitation to where the `:id` goes in the path - we could have chosen to structure it like `/assignments/detail/:id` or `/assignments/:id/detail`, for example.
> There is also no limitation on the names or number of URL parameters. If, *theoretically*, we wanted a page that showed *two* assignments at once, we might have a route like `/assignments/compare/:first/:second`

Inside the route handler, all URL parameters are sub-properties of the `req.params` property. So `req.params.id` will contain the value of the `:id` part of the URL.

If you see where this is going, the next change is very natural: replace the `1` in the `db.execute()`'s second parameter with `req.params.id`. Now, the SQL prepared statement will use the `id` parameter from the URL as the value of `assignmentId` in the query!

Together, the updated route and handler look like this:

```js
app.get( "/assignments/:id", ( req, res, next ) => {
    db.execute(read_assignment_detail_sql, [req.params.id], (error, results) => {
    ...
```

Test it by navigating your browser to `localhost:3000/assignments/1`, then replace the `1` with `2`, then `3`, etc.. You should see data for the corresponding assignments. 

> Why are we using **prepared statements** to construct the SQL query from the URL parameter, instead of simple concatenation, backtick string literals, or even `string.replace`? A user can put anything at all in the URL parameter - so malicious users might try to "inject" their own custom SQL statements, potentially causing the database to execute SQL statements the developers didn't intend to be run. This is called an **SQL injection attack**, and is primarily attempted in order to gain unauthorized access to protected data.
>
> Although our app doesn't have any such authorization limits *yet*, we still don't want any security holes that invite mayhem (see the [popular xkcd comic](https://xkcd.com/327/) which gives a humorous idea of the kind of mayhem SQL injections could cause). Thankfully, prepared statements perform a number of "sanitization" measures to prevent injection, essentially "escaping" inputs so they are not ever interpreted as executable SQL commands.

#### (4.2.2.3) Send a 404 when assignment not found.

If you try a URL like `localhost:3000/assignments/BADID`, you'll see a blank page. Since no assignment with `assignmentId = BADID` exists, the query's `results` are an empty array, and `results[0]` is undefined. This isn't a database error (the query still executed correctly) so a `500` status code is inappropriate, but since the data being requested wasn't found, a status code of `404 Not Found` should be sent along with a more informative message.

Update the query callback code with a new "else if" clause:
```js
    if (DEBUG)
            console.log(error ? error : results);
    if (error)
        res.status(500).send(error); //Internal Server Error
    else if (results.length == 0)
        res.status(404).send(`No assignment found with id = "${req.params.id}"` ); // NOT FOUND
    else
        res.send(results[0]); // results is still an array
```

Navigate your browser to a URL with an invalid `:id` value, such as `localhost:3000/assignments/BADID`. Confirm that the "No assignment found..." message is sent. 

> You can also confirm that both the server logs in the terminal and the browser's developer tools (Inspect -> Network) show the status code is indeed `404 Not Found`.


We have reached the end of PART 1! If you need to review, you can look at the file `app-part1.js` to see the state of `app.js` as it should be now, before PART 2.
## (4.3) Responding with rendered HTML: [PART 2/2] 

We have now seen that Express web servers can either: 

**A.** send a *pre-written, static* HTML web page file (as shown in the previous tutorial). We might call that kind of server a "static file server".
or
**B.** send *dynamic* JSON data, queried from a database (as shown in the previous PART). We might call that kind of server an "API server", since it acts as a thin interface between browsers and the database.

What we really want to do is a third hybrid option: send HTML pages that are  *pre-written* with *mostly static* content, but have some parts that are rendered *dynamically* with data queried from the database at the time of the request/response. This technique defines an entire kind of app architecture, and is known as **server side rendering**, or **SSR**.

>It is worth noting that our app architecture could take a very different direction called **client side rendering (CSR)**  that prefers using API servers. Generally speaking, CSR apps are **single page applications** - just the home page is provided, which then makes calls to the API server for data to *update the page's content without loading a completely different page*. We will briefly explore this architecture in a future tutorial. 

### (4.3.1) Setting up templating with EJS

To help accomplish this, we will introduce the use of **templating** - specifically, the language / framework [EJS (Embedded JavaScript templating)](https://ejs.co/). 

> There are several other templating languages / frameworks (also known as **view engines** that Express can easily use instead of [EJS](https://ejs.co/). Some other popular ones include:
>
> - [Handlebars](https://handlebarsjs.com/) (based on Mustache)
> - [Pug](https://pugjs.org/api/getting-started.html) (formerly known as Jade)
>
> There are pros and cons to each one, but it mostly comes down to style. Feel free to explore; the choice of view engine is by far the easiest part of the tech stack to "switch out." 

First, let's install EJS:
```
> npm install ejs
```
This should update your `package.json` with this dependency (version number may vary):

```json
"ejs": "^3.1.9"
```

> If you're using VS Code as your IDE, I also recommend installing the extension **EJS language support** by DigitalBrainstem.

To configure the express app to use EJS as its **'templating engine'** (aka **'view engine'**), add this code to `app.js` right after the "`//set up the server`" section and before the middleware and routing sections.

```js
//set up the server
...
// Configure Express to use EJS
app.set( "views",  __dirname + "/views");
app.set( "view engine", "ejs" );
...
//middleware (app.use) and routing (app.get) after
```

The first line specifies the `views` subdirectory as the location of all EJS **templates** (aka **views** or even **view-templates**). Our HTML prototypes are already in the `views` subdirectory. However, we need to change their extensions from `.html` to `.ejs`. So now the `views` folder should contain:
```

|-views
| |-assignments.ejs
| |-detail.ejs
| |-index.ejs
```

> Since EJS is technically a "superset" of HTML, any valid HTML file (once the extension is changed to `.ejs`) is already a valid EJS template.

### (4.3.2) Rendering EJS with data

In general, our app can now render and send any template in `views`, by simplying calling:

```js
    res.render(view, ?data);
```
where `view` is the name of the template file (minus the `.ejs`extension).  The optional `data` parameter is how we will give that template data for dynamic rendering. (We'll explain exactly how `data` gets used by the template in just a bit...)

Each of our page routes will call `res.render`, but the specific way we do it will vary. Read on!
#### (4.3.2.1) Rendering the homepage (index.ejs) (1/3)

The simplest case is our homepage; we use the `index` view (which corresponds to the `index.ejs` file), but no data is passed since the page is static. We can simply update the `/` route to this:

```js
// define a route for the default home page
app.get( "/", ( req, res ) => {
    res.render('index');
});
```

For the other two routes that involve querying the database, it gets much more interesting. We'll start with the detail page, then do the list page. 
#### (4.3.2.2)  Rendering the assignment detail page (detail.ejs)

For the `/assignments/:id` route, we want to render the `detail` view (`detail.ejs`), but with the data in `results[0]`. 

The only part that needs to change is the `else` block, but here's the whole updated `/assignments/:id` route:
```js
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
            //  hw: { id: ___ , title: ___ , priority: ___ , 
            //    subjectName: ___ , subjectId: ___, 
            //    dueDateExtended: ___ , dueDateYMD: ___ , description: ___ 
            //  }
        }
    });
});
```

**Key Concept:** All the properties of the `data` object that is passed as the second parameter to `res.render` become accessible as **variables** when EJS is rendering the template. 

This means that the `res.render('detail', data)` call will give `detail.ejs` a variable it can use called `hw`. Let's see how that can be used below...

##### (4.3.2.2.1) Rendering details (Using `<%= ____ %>` EJS output tags)


Currently, the file has some has static data in it. Check out this section:
```html
<div class="section flow-text" id="details">
    <h1>Textbook Assignment</h1>
    <table>
        <tr>
            <th>Priority:</th>
            <td>2</td>
        </tr>
        <tr>
            <th>Subject:</th>
            <td>Math</td>
        </tr>
        <tr>
            <th>Due Date:</th>
            <td>05/26/2023 (Friday)</td>
        </tr>
        <tr>
            <th>Detailed Description:</th>
            <td>
                Do odd questions in the range #155 - #207 (chapter 11).
                Remember to show your work!
            </td>
        </tr>
    </table>
</div>
```

But as an EJS template file, we can change the static data into this:

```ejs
<div class="section flow-text" id="details">
    <h1><%= hw.title %></h1>
    <table>
        <tr>
            <th>Priority:</th>
            <td><%= hw.priority %></td>
        </tr>
        <tr>
            <th>Subject:</th>
            <td><%= hw.subjectName %></td>
        </tr>
        <tr>
            <th>Due Date:</th>
            <td><%= hw.dueDateExtended %></td>
        </tr>
        <tr>
            <th>Detailed Description:</th>
            <td>
                <%= hw.description %>
            </td>
        </tr>
    </table>
</div>
```

Everything within a `<%= ____ %>` in an EJS template gets interpreted as JavaScript snippets and outputs the value of the JS expression into the template as plain text. (We call them **"output tags"**)

So the various `<%= ____ %>` in `detail.ejs` will be replaced with the value of `hw.title`,`hw.priority`,`hw.subject`, etc..., and the resulting HTML will be sent as the response. 

Visit `localhost:3000/assignments/1`, `/2`, `/3`, etc... Magic! You should see the detail page filled with the database's actual data for each assignment.

> A few notes about EJS output tags: 
> 1. If the EJS template tries to use a variable that was *not* a property of `res.render`'s `data` parameter, you'll get an error that it is not defined. 
> 2. If the `<%=___ %>` value is `null` or `undefined`, it will output nothing.
> 3.  `<%= ___ %>`  will "escape" the output as HTML safe text - that is, if the output contains text that could be accidentally interpreted as HTML tags (like `<` or `>`), they will be converted into things that are always interpreted as plaintext (like `&lt;` or `&gt;`). 
> Generally, escaping is a good and safe thing to do (imagine if someone put weird HTML tags as their assignment titles!), but there is an alternative "no-escape" output tag `<%- ___ %>`, which allows you to (dangerously!) inject raw content.

##### (4.3.2.2.2)  Prefilling the Edit Form (Using `<% if... %>` EJS control flow tags)

However, we're not done with the detail page! The `Edit` form in the modal should also have pre-filled values that match the database values. 

Currently, the `<form>` contains the following 5 inputs with hard-coded pre-filled values:
```html
...
<input type="text" id="titleInput" name="title" class="validate"
 data-length="32" required value="Textbook Assignment">
...
<input type="number" id="priorityInput" name="priority"
 class="validate" min=1 max=10 value=2>
...
<select type="number" id="subjectInput" name="subject">
    <option value="" disabled>Choose your subject</option>
    <option value=1>Comp Sci</option>
    <option value=2 selected>Math</option>
    <option value=3>Language</option>
    <option value=4>Music</option>
</select>
...
<input type="date" id="dueDateInput" name="dueDate"
 value="2023-05-26">  <!-- Note that the date value format is "yyyy-mm-dd" -->
...
<textarea class="materialize-textarea" id="descriptionInput" name="description">
    Do odd questions in the range #155 - #207 (chapter 11). Remember to show your work!
</textarea>
```

Note how each form input has its own way of being pre-filled:
- For the 3 `<input>` elements with attributes `type="text"` or `type="number"` , the `value` attribute sets the pre-filled value. 
- For the `<select>` element, the pre-filled `<option>` is indicated by the presence of the `selected` attribute. (In this case, it's the `Math` option)
- For the `<textarea>` element, the contents of the element are what it is prefilled with.

In the same way as shown above, the `<input>` and `<textarea>` can prefilled using the EJS `<%=___%>` tags to inject variable values, like this:
```ejs
<input type="text" id="titleInput" name="title" class="validate" 
 data-length="32" required value="<%= title %>">
...
<input type="number" id="priorityInput" name="priority" 
 class="validate" min=1 max=10 value=<%= priority %>>
...
<input type="date" id="dueDateInput" name="dueDate" 
 value=<%= dueDateYMD %>>  <!-- Note that the date value format is "yyyy-mm-dd" -->
...
<textarea class="materialize-textarea" id="descriptionInput" 
 name="description"><%= description %></textarea>

```
> Note the use of quotation marks around the output tag in `value="<%= title %>"` - if the output is multiple words, quotations are needed to assign the entirety of it as the `value` attribute.

To pre-fill the `<select>` element, we'll need to use another EJS technique - the **EJS control flow "tags"**.

EJS control flow is done with `<% ___ %>` (no `=` inside!) "tags", and can contain class JS control flow statements like `if(...){...}`, `while(...){...}`, `for(...){...}`, etc. These are quite powerful!

Here's how the `<select>` can be prefilled:
```ejs
<select type="number" id="subjectInput" name="subject" required>
    <option value="" disabled > Choose your subject </option>
    <option value=1   <% if (hw.subjectId == 1) { %> selected <% } %>> Comp Sci </option>
    <option value=2   <% if (hw.subjectId == 2) { %> selected <% } %>> Math </option>
    <option value=3   <% if (hw.subjectId == 3) { %> selected <% } %>> Language </option>
    <option value=4   <% if (hw.subjectId == 4) { %> selected <% } %>> Music </option>
    <option value=5   <% if (hw.subjectId == 5) { %> selected <% } %>> Biology </option>
    <option value=6   <% if (hw.subjectId == 6) { %> selected <% } %>> History </option>
</select>
```

This can be pretty weird to understand at first, so take a minute to digest it:
- The `<% %>` tags are being used to create multiple `if` statements = the `if(...){` and `}` are in separate tags, with a *body* between them.
- When the `if` *condition* evaluates to true, then the *body* of the `if` statement will be rendered. When false, the *body* is not rendered!
- In this case, each of the `if` *conditions* are checking if the `hw.subjectId` matches the `<option>`'s value. The `if` *body* contains the `selected` attribute.
- Since `subject` can only match one of the `<option>`, only the `<option>` that matches will have the `selected` attribute rendered (and none of the others will), thus pre-selecting it in the resulting page's form.

Visit `localhost:3000/assignments/1`, `/2`, `/3`, etc... again. Even more magic! The `Edit` form's various inputs should be pre-filled with the database's data.

> Our original prototype only had 4 subject options, but now the database contains 6 options for subject. We added the additonal subject options to match our database, but as soon as our database changes, our hard-coded options will be out of sync.
> 
> We won't address the final solution to this problem now, but we will in a later tutorial after we give users the ability to add new subjects.
>
> For now, you should update the `<select>` in the `assignments.ejs` template as well, so as to also include all 6 options:
> ```
><select id="subjectInput" name="subject" required>
>    <option value="" disabled selected>Choose your subject</option>
>    <option value=1>Comp Sci</option>
>    <option value=2>Math</option>
>    <option value=3>Language</option>
>    <option value=4>Music</option>
>    <option value=5>Biology</option>
>    <option value=6>History</option>
></select>
> ``` 

#### (4.3.2.3) Rendering the assignments list page (assignments.ejs) (Using `<% for... %>` EJS control flow tags)

Finally, for the `/assignments` route, we want to render the `assignments` view (`assignments.ejs`) using the entirety of the query `results`, which is an array of objects representing rows in the database table.

Here's the whole `/assignments/:id` route, updated:

```js
app.get( "/assignments", ( req, res ) => {
    db.execute(read_assignments_all_sql, (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else {
            let data = { hwlist : results };
            res.render('assignments', data);
            // data's object structure: 
            //  { hwlist: [
            //     {  id: __ , title: __ , priority: __ , subject: __ ,  dueDateFormatted: __ },
            //     {  id: __ , title: __ , priority: __ , subject: __ ,  dueDateFormatted: __ },
            //     ...]
            //  }
        }
    });
});
```

To make the entire `results` array accessible for the template, we can create a new object `data` with property `hwlist : results`. When `res.render('assignments', data)` is called, the variable `hwlist` - which is the whole `results` array - is then available to the `assignments.ejs` EJS template.

Currently, the `assignments.ejs` contains a `<table>` element, and inside its `<tbody>` we have several`<tr>` elements with static data, like this:
```html
<tbody>
    <tr>
        <td>Textbook Exercises</td>
        <td>2</td>
        <td>Math</td>
        <td>05/26/2023 (Fri)</td>
        <td>
            <a class="btn-small waves-effect waves-light" href="/assignments/detail">
                <i class="material-icons right">edit</i>
                Info/Edit
            </a>
            <a class="btn-small waves-effect waves-light red">
                <i class="material-icons right">delete</i>
                Delete
            </a>
        </td>
    </tr>
    <tr>
        <td>Long Form Essay</td>
        <td>8</td>
        <td>Language</td>
        <td>06/01/2023 (Thu)</td>
        <td>
            <a class="btn-small waves-effect waves-light" href="/assignments/detail">
                <i class="material-icons right">edit</i>
                Info/Edit
            </a>
            <a class="btn-small waves-effect waves-light red">
                <i class="material-icons right">delete</i>
                Delete
            </a>
        </td>
    </tr>

    <tr>
        <td>Web App Project</td>
        <td>5</td>
        <td>Comp Sci</td>
        <td>06/07/2023 (Wed)</td>
        <td>
            <a class="btn-small waves-effect waves-light" href="/assignments/detail">
                <i class="material-icons right">edit</i>
                Info/Edit
            </a>
            <a class="btn-small waves-effect waves-light red">
                <i class="material-icons right">delete</i>
                Delete
            </a>
        </td>
    </tr>
</tbody>

```

Now replace the entire static `<tbody>` with the following: 

```ejs
<tbody>
    <% for (let i = 0; i < hwlist.length; i++) { %>
    <tr>
        <td><%= hwlist[i].title %></td>
        <td><%= hwlist[i].priority %></td>
        <td><%= hwlist[i].subject %></td>
        <td><%= hwlist[i].dueDateFormatted %></td>
        <td>
            <a class="btn-small waves-effect waves-light" href="/assignments/<%= hwlist[i].id %>">
                <i class="material-icons right">edit</i>
                Info/Edit
            </a>
            <a class="btn-small waves-effect waves-light red">
                <i class="material-icons right">delete</i>
                Delete
            </a>
        </td>
    </tr>
    <% } %>
</tbody>
```

Note the **EJS control flow tags** with the for loop, surround the `<tr>`: 

```ejs
<% for (let i = 0; i < inventory.length; i++) { %>
<tr>
    ...
</tr>
<% } %>
```

Navigate to `localhost:3000/assignments`. Even more magic! You should see the table filled with multiple rows containing information for each assignment in the database - and clicking the buttons navigates to the matching assignment detail pages!

To break what's happening down: the control flow loops over `hwlist` array (aka the `results` from the database), and all the content inside the loop is ***repeated*** for each iteration, making a new `<tr>` for each element of `hwlist`.

The output tags like `<%= hwlist[i].title %>` work as before, injecting the values of the expression (each element o inventory's properties/columns) into the HTML.

The most interesting use of the output tags here is setting the hyperlink for each assignment's "Info / Edit" button to the URL for the corresponding detail page, based on the `id` property:

```ejs
    <a ... href="/assignments/<%= hwlist[i].id %>">
```

> **NOTE: ALTERNATIVE FOR LOOPS**
> Instead of a classic `for` loop, you could instead use a `forEach` loop:
> ```ejs
>   <% hwlist.forEach( hw => { %>
>       <tr>
>           <td><%= hw.title %></td>
>           ...  <!-- continued use of hw -->
>       </tr>
>   <% }); %>
>```
> or a `for...of` loop:
>```ejs
>   <% for( const hw of hwlist ) { %>
>       <tr>
>           <td><%= hw.title %></td>
>           ...  <!-- continued use of hw -->
>       </tr>
>   <% } %>
>```
> 

## (4.4) Conclusion:

We now have a fully connected 3-layer web app! Using SQL queries and EJS, the server  renders the HTML upon request, transforming our static pages into dynamic ones that deliver live content.

> In the tutorials so far, we first prototyped the pages, then designed the database accordingly, wrote queries, and finally modified the prototype into a template based on the queries. There is no requirement, however, that you always follow the same process: the template could come before the data queries are written, or the database could come before the protoypes. You might even skip the protoype step altogether, if you have a strong idea of how the various layers will interact from the start.

Of course, the app is far from fully *functional* or *fleshed out.* 

Our rendered pages actually have a major missing piece - the `<select>` drop downs for the subject in the forms are not being rendered with all the options listed in the `subjects` table. And, of course, those forms still don't do anything...

The next steps are to dynamically render those drop downs, fully implement the forms so that they produce "`POST`" requests to create and update entries in the database, and make the delete buttons also update the database. We would also like to improve our assignment list page to have sorting options.