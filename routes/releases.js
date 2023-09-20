import { Router } from "express";
import connection from "../database.js";

const releasesRouter = Router();

// GET all releases
releasesRouter.get("/", (req, res) => {
  const query = 'SELECT * FROM `releases` ORDER BY `releaseId`';
  connection.query(query, (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' }); 
    } else {
      res.json(results); 
    }
  });
});

// GET release by releaseId
releasesRouter.get("/:releaseId", (req, res) => {
  const releaseId = req.params.releaseId;
  const query = 'SELECT * FROM `releases` WHERE releaseId = ?';

  connection.query(query, [releaseId], (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' }); 
    } else {
      if (results.length > 0) {
        res.json(results[0]);
      } else {
        res.status(404).json({ error: 'Release not found' });
      }
    }
  });
});

// GET releases by artistId
releasesRouter.get("/artist/:artistId", (req, res) => {
  const artistId = req.params.artistId;
  const query = /*sql*/ `
    SELECT *
    FROM releases r
    WHERE r.releaseId IN (
      SELECT ar.releaseId
      FROM artistRelease ar
      WHERE ar.artistId = ?
    )
    ORDER BY r.releaseId;
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


export { releasesRouter };