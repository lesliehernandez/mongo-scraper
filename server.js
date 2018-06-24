//Require dependences
const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const handlebars = require("express-handlebars")
const router = express.Router();
const request = require('request');
const cheerio = require("cheerio");

// Initialize Express
const app = express();

// Use morgan logger 
app.use(logger("dev"));

// Use body-parser for handling form submissions //
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory //
app.use(express.static("public"));

// Use handlebars
app.engine("handlebars", handlebars({ defaultLayout: "main" }))
app.set("view engine", "handlebars")

//Connect to mongodb
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/articles";

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI);


//Connect to mongoose
var db = mongoose.connection;
db.once('open', function () {
    console.log("Mongoose connection successful!")
})

//Show any mongoose errors
db.on('error', function (err) {
    console.log('Mongoose Error: ', err);
});

//Require models
var commentModel = require("./models/comment.js");
var articleModel = require("./models/article.js");

// Routes

// Index Route
app.get("/", function (req, res) {
    res.render("index")
})

// Route that scrapes Pitchfork's website
app.get("/scrape", function (req, res) {
    //Grab body of the html with request
    request("https://pitchfork.com/latest/", function (error, response, html) {
        //Load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);

        //Grab every h2 within an article tag
        $("article-details module__article-details").each(function(i, element) {
            // Save an empty result object
            var result = {};
      
            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
              .children("a")
              .text();
            result.link = $(this)
              .children("a")
              .attr("href");
      
            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
              .then(function(dbArticle) {
                // View the added result in the console
                console.log(dbArticle);
              })
              .catch(function(err) {
                // If an error occurred, send it to the client
                return res.json(err);
              });
          });

        // If we were able to successfully scrape and save an article, send a message to the client
        res.send("Scrape Complete");
    });
});

// Route for getting all articles from the db
app.get("/articles", function(req, res) {
    // Grab every document in the articles collection
    db.Article.find({})
      .then(function(dbArticle) {
        // If we were able to successfully find articles, send them back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });

// Route for grabbing a specific article by id, populate it with it's comment
app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article.findOne({ _id: req.params.id })
      // ..and populate all of the notes associated with it
      .populate("comment")
      .then(function(dbArticle) {
        // If we were able to successfully find an article with the given id, send it back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });

// Route for saving/updating an article's associated cote
app.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
      .then(function(dbNote) {
        // If a Note was created successfully, find one article with an `_id` equal to `req.params.id`. Update the article to be associated with the new Note
        // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
        // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbcomment._id }, { new: true });
      })
      .then(function(dbArticle) {
        // If we were able to successfully update an Article, send it back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });

// Start the server
var port = process.env.PORT || 8080;
app.listen(port, function () {
    console.log('Listening on PORT ' + port);
})