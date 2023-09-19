import { Router } from "express";
import connection from "../database.js";

const tracksRouter = Router();

// GET all tracks
tracksRouter.get("/", (req, res) => {
  const query = 'SELECT * FROM `tracks` ORDER BY `trackId`';
  connection.query(query, (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' }); 
    } else {
      res.json(results); 
    }
  });
});

// GET tracks by releaseId
tracksRouter.get("/release/:releaseId", (req, res) => {
  const releaseId = req.params.releaseId;
  const query = /*sql*/ `
    SELECT t.trackTitle
    FROM tracks t
    JOIN releaseTrack rt ON t.trackId = rt.trackId
    WHERE rt.releaseId = ?
    ORDER BY t.trackId;
  `;

  connection.query(query, [releaseId], (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' }); 
    } else {
      res.json(results); 
    }
  });
});

// GET search for tracks eg http://localhost:3333/tracks/search?q=
tracksRouter.get("/search", (req, res) => {
    const query = req.query.q;
    const queryString = /*sql*/ `
    SELECT * 
    FROM tracks
    WHERE trackTitle LIKE ?
    ORDER BY trackTitle`;

    const values = [`%${query}%`];
    connection.query(queryString, values, (error, results) => {
        if (error) {
            console.log(error);
        } else {
            res.json(results);
        }
    });
});


export { tracksRouter };