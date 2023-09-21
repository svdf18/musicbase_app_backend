import { Router } from "express";
import connection from "../database.js";

const tracksRouter = Router();

//---- GET HTTP ----//

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

// GET a specific track by trackId with artistName and releaseTitle
tracksRouter.get("/:trackId", (req, res) => {
  const trackId = req.params.trackId;
  const query = /*sql*/`
    SELECT 
      t.*,
      a.artistName AS artistName,
      r.releaseTitle AS releaseTitle
    FROM tracks t
    INNER JOIN artistTrack at ON t.trackId = at.trackId
    INNER JOIN artists a ON at.artistId = a.artistId
    INNER JOIN releaseTrack rt ON t.trackId = rt.trackId
    INNER JOIN releases r ON rt.releaseId = r.releaseId
    WHERE t.trackId = ?
  `;
  
  connection.query(query, [trackId], (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' });
    } else {
      if (results.length === 0) {
        res.status(404).json({ error: 'Track not found' });
      } else {
        res.json(results[0]);
      }
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

//----POST HTTP----//

// Create a new track and link it to an artist by releaseId !!!! PROBLEMS W ARTISTID I ARTISTRELEASE !!!!
tracksRouter.post("/", (req, res) => {
  const { trackTitle, releaseId } = req.body;

  // Check if required fields are provided
  if (!trackTitle || !releaseId) {
    return res.status(400).json({ error: 'TrackTitle and ReleaseId are required' });
  }

  // Check if the release with the specified releaseId exists
  const checkReleaseQuery = 'SELECT releaseId FROM `releases` WHERE releaseId = ?';

  connection.query(checkReleaseQuery, [releaseId], (checkReleaseErr, checkReleaseResults) => {
    if (checkReleaseErr) {
      console.log(checkReleaseErr);
      return res.status(500).json({ error: 'An error occurred while checking the release' });
    }

    if (checkReleaseResults.length === 0) {
      // Release with the specified releaseId does not exist
      return res.status(404).json({ error: 'Release not found' });
    }

    // Create a new track in the tracks table
    const insertTrackQuery = 'INSERT INTO `tracks` (trackTitle) VALUES (?)';
    
    connection.query(insertTrackQuery, [trackTitle], (insertTrackErr, trackResult) => {
      if (insertTrackErr) {
        console.log(insertTrackErr);
        return res.status(500).json({ error: 'An error occurred while creating the track' });
      }

      const newTrackId = trackResult.insertId;

      // Link the track to the artist based on the shared releaseId in the artistRelease table
      const linkArtistReleaseQuery = 'INSERT INTO `artistRelease` (artistId, releaseId) SELECT artistId, ? FROM `releaseTrack` WHERE trackId = ?';
      
      connection.query(linkArtistReleaseQuery, [releaseId, newTrackId], (linkErr, linkResult) => {
        if (linkErr) {
          console.log(linkErr);
          return res.status(500).json({ error: 'An error occurred while linking the track and artist' });
        }

        res.status(201).json({ trackId: newTrackId, message: 'Track created and linked to artist successfully' });
      });
    });
  });
});

// Delete a track by trackId
tracksRouter.delete("/:trackId", (req, res) => {
  const trackId = req.params.trackId;

  // Check if the track with the specified trackId exists
  const checkQuery = 'SELECT trackId FROM `tracks` WHERE trackId = ?';

  connection.query(checkQuery, [trackId], (checkErr, checkResults) => {
    if (checkErr) {
      console.log(checkErr);
      return res.status(500).json({ error: 'An error occurred while checking the track' });
    }

    if (checkResults.length === 0) {
      // Track with the specified trackId does not exist
      return res.status(404).json({ error: 'Track not found' });
    }

    // Delete the track from the database
    const deleteQuery = 'DELETE FROM `tracks` WHERE trackId = ?';

    connection.query(deleteQuery, [trackId], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.log(deleteErr);
        res.status(500).json({ error: 'An error occurred while deleting the track' });
      } else {
        res.status(200).json({ message: 'Track deleted successfully' });
      }
    });
  });
});

export { tracksRouter };