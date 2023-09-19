import { Router } from "express";
import connection from "../database.js";

const releasesRouter = Router();

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

export { releasesRouter };