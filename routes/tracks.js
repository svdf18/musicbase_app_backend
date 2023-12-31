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

// GET search for tracks eg http://localhost:3333/tracks/search/query?q=
tracksRouter.get("/search/query", (req, res) => {
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
// Create a new track and link it to an artist by releaseId
tracksRouter.post("/", (req, res) => {
  const { trackTitle, releaseId } = req.body;

  if (!trackTitle || !releaseId) {
    return res.status(400).json({ error: 'TrackTitle and ReleaseId are required' });
  }

  const checkReleaseQuery = 'SELECT releaseId FROM `releases` WHERE releaseId = ?';

  connection.query(checkReleaseQuery, [releaseId], (checkReleaseErr, checkReleaseResults) => {
    if (checkReleaseErr) {
      console.log(checkReleaseErr);
      return res.status(500).json({ error: 'An error occurred while checking the release' });
    }

    if (checkReleaseResults.length === 0) {
      return res.status(404).json({ error: 'Release not found' });
    }

    // Create a new track in the tracks tableç
    const insertTrackQuery = 'INSERT INTO `tracks` (trackTitle) VALUES (?)';

    connection.query(insertTrackQuery, [trackTitle], (insertTrackErr, trackResult) => {
      if (insertTrackErr) {
        console.log(insertTrackErr);
        return res.status(500).json({ error: 'An error occurred while creating the track' });
      }

      const newTrackId = trackResult.insertId;

      // Link the track to the release based on the provided releaseId
      const linkReleaseTrackQuery = 'INSERT INTO `releaseTrack` (releaseId, trackId) VALUES (?, ?)';
      
      connection.query(linkReleaseTrackQuery, [releaseId, newTrackId], (linkErr, linkResult) => {
        if (linkErr) {
          console.log(linkErr);
          return res.status(500).json({ error: 'An error occurred while linking the track and release' });
        }

        res.status(201).json({ trackId: newTrackId, message: 'Track created and linked to release successfully' });
      });
    });
  });
});

//---- PUT HTTP ----//
// Update an existing track by trackId
tracksRouter.put("/:trackId", (req, res) => {
  const trackId = req.params.trackId;
  const { trackTitle } = req.body;

  if (!trackTitle) {
    return res.status(400).json({ error: 'TrackTitle is required' });
  }

  // Check if the track with the specified trackId exists
  const checkTrackQuery = 'SELECT trackId FROM `tracks` WHERE trackId = ?';

  connection.query(checkTrackQuery, [trackId], (checkTrackErr, checkTrackResults) => {
    if (checkTrackErr) {
      console.log(checkTrackErr);
      return res.status(500).json({ error: 'An error occurred while checking the track' });
    }

    if (checkTrackResults.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Update the existing track in the tracks table
    const updateTrackQuery = 'UPDATE `tracks` SET trackTitle = ? WHERE trackId = ?';
    
    connection.query(updateTrackQuery, [trackTitle, trackId], (updateTrackErr, result) => {
      if (updateTrackErr) {
        console.log(updateTrackErr);
        res.status(500).json({ error: 'An error occurred while updating the track' });
      } else {
        res.status(200).json({ trackId, message: 'Track updated successfully' });
      }
    });
  });
});

//---- DELETE HTTP ----//

// Delete a track by trackId, including related data
tracksRouter.delete("/:trackId", (req, res) => {
  const trackId = req.params.trackId;

  const checkQuery = 'SELECT trackId FROM `tracks` WHERE trackId = ?';

  connection.query(checkQuery, [trackId], (checkErr, checkResults) => {
    if (checkErr) {
      console.log(checkErr);
      return res.status(500).json({ error: 'An error occurred while checking the track' });
    }

    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Delete related data in releaseTrack and artistTrack tables
    const deleteRelatedDataQuery = `
      DELETE FROM releaseTrack WHERE trackId = ?;
      DELETE FROM artistTrack WHERE trackId = ?;
    `;

    connection.query(deleteRelatedDataQuery, [trackId, trackId], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.log(deleteErr);
        res.status(500).json({ error: 'An error occurred while deleting related data' });
      } else {

        const deleteTrackQuery = 'DELETE FROM `tracks` WHERE trackId = ?';

        connection.query(deleteTrackQuery, [trackId], (deleteTrackErr, deleteTrackResult) => {
          if (deleteTrackErr) {
            console.log(deleteTrackErr);
            res.status(500).json({ error: 'An error occurred while deleting the track' });
          } else {
            res.status(200).json({ message: 'Track and related data deleted successfully' });
          }
        });
      }
    });
  });
});

export { tracksRouter };