import { Router } from "express";
import connection from "../database.js";

const artistsRouter = Router();

// GET all artists
artistsRouter.get("/", (req, res) => {
  const query = 'SELECT * FROM `artists` ORDER BY `artistName`';
  connection.query(query, (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' }); 
    } else {
      res.json(results); 
    }
  });
});

// GET artist by id
artistsRouter.get("/:artistId", (req, res) => {
  const artistId = req.params.artistId;
  const query = 'SELECT * FROM `artists` WHERE artistId = ?';
  
  connection.query(query, [artistId], (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' }); 
    } else {
      if (results.length > 0) {
        res.json(results[0]); // Return the first result (assuming artistId is unique)
      } else {
        res.status(404).json({ error: 'Artist not found' });
      }
    }
  });
});

// GET tracks by artistId + add role PRIMARY or FEATURING
artistsRouter.get("/tracks/:artistId", (req, res) => {
  const artistId = req.params.artistId;
  const query = /*sql*/ `
    SELECT 
      t.trackTitle,
      CASE
        WHEN LOWER(t.trackTitle) LIKE CONCAT('%', LOWER(a.artistName), '%') THEN 'FEATURING ARTIST'
        ELSE 'PRIMARY ARTIST'
      END AS artistRole
    FROM tracks t
    LEFT JOIN artistTrack at ON t.trackId = at.trackId
    LEFT JOIN artists a ON at.artistId = a.artistId
    WHERE a.artistId = ?
    ORDER BY artistRole, t.trackId;
  `;

  connection.query(query, [artistId], (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' }); 
    } else {
      res.json(results); 
    }
  });
});

export { artistsRouter };