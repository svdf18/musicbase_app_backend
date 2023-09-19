import { Router } from "express";
import connection from "../database.js";

const tracksRouter = Router();

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

export { tracksRouter };