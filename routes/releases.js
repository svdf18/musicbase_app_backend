import { Router } from "express";
import connection from "../database.js";

const releasesRouter = Router();

//---- GET HTTP ----//

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

// GET release by releaseId with artistName
releasesRouter.get("/:releaseId", (req, res) => {
  const releaseId = req.params.releaseId;
  const query = /*sql*/`
    SELECT 
      r.*,
      a.artistName AS artistName
    FROM releases r
    INNER JOIN artistRelease ar ON r.releaseId = ar.releaseId
    INNER JOIN artists a ON ar.artistId = a.artistId
    WHERE r.releaseId = ?
  `;

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

// GET search for releases eg http://localhost:3333/releases/search?q=
releasesRouter.get("/search", (req, res) => {
    const query = req.query.q;
    const queryString = /*sql*/ `
    SELECT * 
    FROM releases
    WHERE releaseTitle LIKE ?
    ORDER BY releaseTitle`;

    const values = [`%${query}%`];
    connection.query(queryString, values, (error, results) => {
        if (error) {
            console.log(error);
        } else {
            res.json(results);
        }
    });
});

// Create a new release and link it to an artist by artistId
releasesRouter.post("/", (req, res) => {
  const { releaseTitle, releaseYear, label, artistId } = req.body;

  // Check if required fields are provided
  if (!releaseTitle || !releaseYear || !label || !artistId) {
    return res.status(400).json({ error: 'ReleaseTitle, ReleaseYear, Label, and ArtistId are required' });
  }

  // Check if the artist with the specified artistId exists
  const checkArtistQuery = 'SELECT artistId FROM `artists` WHERE artistId = ?';

  connection.query(checkArtistQuery, [artistId], (checkArtistErr, checkArtistResults) => {
    if (checkArtistErr) {
      console.log(checkArtistErr);
      return res.status(500).json({ error: 'An error occurred while checking the artist' });
    }

    if (checkArtistResults.length === 0) {
      // Artist with the specified artistId does not exist
      return res.status(404).json({ error: 'Artist not found' });
    }

    // Create a new release in the releases table
    const insertReleaseQuery = 'INSERT INTO `releases` (releaseTitle, releaseYear, label) VALUES (?, ?, ?)';
    
    connection.query(insertReleaseQuery, [releaseTitle, releaseYear, label], (insertReleaseErr, releaseResult) => {
      if (insertReleaseErr) {
        console.log(insertReleaseErr);
        return res.status(500).json({ error: 'An error occurred while creating the release' });
      }

      const newReleaseId = releaseResult.insertId;

      // Link the artist to the new release in the artistRelease table
      const linkArtistReleaseQuery = 'INSERT INTO `artistRelease` (artistId, releaseId) VALUES (?, ?)';
      
      connection.query(linkArtistReleaseQuery, [artistId, newReleaseId], (linkErr, linkResult) => {
        if (linkErr) {
          console.log(linkErr);
          return res.status(500).json({ error: 'An error occurred while linking the artist and release' });
        }

        res.status(201).json({ releaseId: newReleaseId, message: 'Release created and linked to artist successfully' });
      });
    });
  });
});

//---- DELETE HTTP ----//

// Delete a release by releaseId
releasesRouter.delete("/:releaseId", (req, res) => {
  const releaseId = req.params.releaseId;

  // Check if the release with the specified releaseId exists
  const checkQuery = 'SELECT releaseId FROM `releases` WHERE releaseId = ?';

  connection.query(checkQuery, [releaseId], (checkErr, checkResults) => {
    if (checkErr) {
      console.log(checkErr);
      return res.status(500).json({ error: 'An error occurred while checking the release' });
    }

    if (checkResults.length === 0) {
      // Release with the specified releaseId does not exist
      return res.status(404).json({ error: 'Release not found' });
    }

    // Delete the release from the database
    const deleteQuery = 'DELETE FROM `releases` WHERE releaseId = ?';

    connection.query(deleteQuery, [releaseId], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.log(deleteErr);
        res.status(500).json({ error: 'An error occurred while deleting the release' });
      } else {
        res.status(200).json({ message: 'Release deleted successfully' });
      }
    });
  });
});

export { releasesRouter };