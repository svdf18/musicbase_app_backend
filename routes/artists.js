import { Router } from "express";
import connection from "../database.js";

const artistsRouter = Router();

//---- GET HTTP ----//

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
        res.json(results[0]);
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

// GET search for artists eg http://localhost:3333/artists/search/query?q=
artistsRouter.get("/search/query", (req, res) => {
    const queryString = req.query.q;
    const query = /*sql*/ `
      SELECT * 
      FROM artists
      WHERE artistName LIKE ?
      ORDER BY artistName`;

    const values = [`%${queryString}%`];
    connection.query(query, values, (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).json({ error: 'An error occurred while searching for artists' });
        } else {
            res.json(results);
        }
    });
});


// GET tracks where artist w. artistId = ? is featuring
artistsRouter.get("/featuring-releases/:artistId", (req, res) => {
  const artistId = req.params.artistId;
  const query = /*sql*/ `
    SELECT 
      t.trackTitle,
      r.releaseTitle,
      r.releaseYear,
      r.label
    FROM releaseTrack rt
    INNER JOIN releases r ON rt.releaseId = r.releaseId
    INNER JOIN tracks t ON rt.trackId = t.trackId
    INNER JOIN artistTrack at ON t.trackId = at.trackId
    INNER JOIN artists a ON at.artistId = a.artistId
    WHERE a.artistId = ? AND t.trackTitle LIKE CONCAT('%', a.artistName, '%')
    ORDER BY r.releaseYear DESC;
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


//---- POST HTTP ----//

// Create a new artist
artistsRouter.post("/", (req, res) => {
  const { artistName, realName, city, activeSince } = req.body;

  if (!artistName) {
    return res.status(400).json({ error: 'ArtistName is required' });
  }

  // Check if the artistName already exists in the database
  const checkQuery = 'SELECT artistId FROM `artists` WHERE artistName = ?';

  connection.query(checkQuery, [artistName], (checkErr, checkResults) => {
    if (checkErr) {
      console.log(checkErr);
      return res.status(500).json({ error: 'An error occurred while checking artistName' });
    }

    if (checkResults.length > 0) {
      return res.status(400).json({ error: 'ArtistName already exists' });
    }

    // Create a new artist in the database
    const insertQuery = 'INSERT INTO `artists` (artistName, realName, city, activeSince) VALUES (?, ?, ?, ?)';
    
    connection.query(insertQuery, [artistName, realName, city, activeSince], (insertErr, result) => {
      if (insertErr) {
        console.log(insertErr);
        res.status(500).json({ error: 'An error occurred while creating the artist' });
      } else {
        const newArtistId = result.insertId;
        res.status(201).json({ artistId: newArtistId, message: 'Artist created successfully' });
      }
    });
  });
});

//---- PUT HTTP ----//

// Update an existing artist
artistsRouter.put("/:artistId", (req, res) => {
  const artistId = req.params.artistId;
  const { artistName, realName, city, activeSince } = req.body;

  if (!artistName) {
    return res.status(400).json({ error: 'ArtistName is required' });
  }

  // Check if the artistName already exists in the database, excluding the current artist
  const checkQuery = 'SELECT artistId FROM `artists` WHERE artistName = ? AND artistId != ?';

  connection.query(checkQuery, [artistName, artistId], (checkErr, checkResults) => {
    if (checkErr) {
      console.log(checkErr);
      return res.status(500).json({ error: 'An error occurred while checking artistName' });
    }

    if (checkResults.length > 0) {
      return res.status(400).json({ error: 'ArtistName already exists' });
    }

    // Update the existing artist in the database
    const updateQuery = 'UPDATE `artists` SET artistName = ?, realName = ?, city = ?, activeSince = ? WHERE artistId = ?';
    
    connection.query(updateQuery, [artistName, realName, city, activeSince, artistId], (updateErr, result) => {
      if (updateErr) {
        console.log(updateErr);
        res.status(500).json({ error: 'An error occurred while updating the artist' });
      } else {
        res.status(200).json({ artistId, message: 'Artist updated successfully' });
      }
    });
  });
});

//---- DELETE HTTP ----//

// Delete an artist by artistId, including related data
artistsRouter.delete("/:artistId", (req, res) => {
  const artistId = req.params.artistId;

  const checkQuery = 'SELECT artistId FROM `artists` WHERE artistId = ?';

  connection.query(checkQuery, [artistId], (checkErr, checkResults) => {
    if (checkErr) {
      console.log(checkErr);
      return res.status(500).json({ error: 'An error occurred while checking the artist' });
    }

    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    // Delete the artist from the related tables (artistRelease, artistTrack)
    const deleteRelatedDataQuery = `
      DELETE FROM artistRelease WHERE artistId = ?;
      DELETE FROM artistTrack WHERE artistId = ?;
    `;

    connection.query(deleteRelatedDataQuery, [artistId, artistId], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.log(deleteErr);
        res.status(500).json({ error: 'An error occurred while deleting related data' });
      } else {
        const deleteArtistQuery = 'DELETE FROM `artists` WHERE artistId = ?';

        connection.query(deleteArtistQuery, [artistId], (deleteArtistErr, deleteArtistResult) => {
          if (deleteArtistErr) {
            console.log(deleteArtistErr);
            res.status(500).json({ error: 'An error occurred while deleting the artist' });
          } else {
            res.status(200).json({ message: 'Artist and related data deleted successfully' });
          }
        });
      }
    });
  });
});

export { artistsRouter };