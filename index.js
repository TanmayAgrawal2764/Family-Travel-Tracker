import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

env.config();
const app = express();
const port = 3000;
const db = new pg.Client({
  user: process.env.USERR,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: 5432,
});
await db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// let currentUserId = 1;
var cur_user = 2;
var flag = false;

let users = (await db.query("SELECT * FROM users")).rows;

async function checkVisited(cur_user) {
  const result = await db.query(
    "SELECT * FROM (SELECT * FROM visited_countries JOIN users ON visited_countries.user_id=users.id) AS D WHERE user_id=($1)",
    [cur_user],
  );

  let countries = [],
    colors = "";
  result.rows.forEach((country) => {
    colors = country.color;
    countries.push(country.country_code);
  });
  return [countries, colors];
}
app.get("/", async (req, res) => {
  var countrie = await checkVisited(cur_user);
  var country = countrie[0],
    colors = countrie[1];
  flag
    ? res.render("index.ejs", {
        countries: country,
        countries: country,
        total: country.length,
        users: users,
        color: colors,
        error: " Error: Enter a valid country name",
      })
    : res.render("index.ejs", {
        countries: country,
        total: country.length,
        users: users,
        color: colors,
      });
  flag = false;
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];
  if (cur_user === "") {
    flag = true;
    res.redirect("/");
  } else {
    try {
      const result = await db.query(
        "SELECT country_code FROM all_countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
        [input.toLowerCase()],
      );

      let data = result.rows[0];
      let countryCode = data.country_code;

      if (countryCode === "IO") {
        countryCode = "IN";
      }
      try {
        await db.query(
          "INSERT INTO visited_countries (country_code,user_id) VALUES ($1,$2)",
          [countryCode, cur_user],
        );
        res.redirect("/");
      } catch (err) {
        console.log(err);
        var countries = await checkVisited(cur_user);
        var country = countries[0],
          colors = countries[1];
        res.render("index.ejs", {
          countries: country,
          countries: country,
          total: country.length,
          users: users,
          color: colors,
          error: " Error: Enter only a new country name",
        });
      }
    } catch (err) {
      console.log(err);
      var countries = await checkVisited(cur_user);
      var country = countries[0],
        colors = countries[1];
      res.render("index.ejs", {
        countries: country,
        countries: country,
        total: country.length,
        users: users,
        color: colors,
        error: " Error: Enter only a valid country name",
      });
    }
  }
});
app.get("/user", (req, res) => {
  res.redirect("/");
});

app.post("/user", async (req, res) => {
  if (req.body.add) {
    res.render("new.ejs");
  } else {
    cur_user = req.body.user;
    var countries = await checkVisited(cur_user);
    var country = countries[0],
      colors = countries[1];
    res.render("index.ejs", {
      countries: country,
      total: country.length,
      users: users,
      color: colors,
    });
  }
});

app.post("/new", async (req, res) => {
  var name = req.body.name;
  var color = req.body.color;
  var res3 = await db.query(
    "INSERT INTO users (name,color) VALUES ($1,$2) RETURNING *",
    [name, color],
  );
  users.push(res3.rows[0]);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
