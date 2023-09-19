import { Router } from "express";
import connection from "../database.js";

const artistsRouter = Router();

artistsRouter.get("/", (req, res) => {
  const query = 'SELECT * FROM `artists` ORDER BY `artistId`';
  connection.query(query, (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' }); 
    } else {
      res.json(results); 
    }
  });
});

export { artistsRouter };