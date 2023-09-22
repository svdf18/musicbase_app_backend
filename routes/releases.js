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

//Get release info for export
releasesRouter.get("/export/:releaseId", (req, res) => {
  const releaseId = req.params.releaseId;

  const query = /*sql*/`
    SELECT 
      a.artistName,
      a.realName,
      a.city,
      a.activeSince,
      r.releaseTitle,
      r.releaseYear,
      r.label,
      t.trackTitle
    FROM releases r
    INNER JOIN artistRelease ar ON r.releaseId = ar.releaseId
    INNER JOIN artists a ON ar.artistId = a.artistId
    INNER JOIN releaseTrack rt ON r.releaseId = rt.releaseId
    INNER JOIN tracks t ON rt.trackId = t.trackId
    WHERE r.releaseId = ?
  `;

  connection.query(query, [releaseId], (err, results, fields) => {
    if (err) {
      console.log(err);
      res.status(500).json({ error: 'An error occurred' }); 
    } else {
      if (results.length > 0) {
        // Create an object to store the structured data
        const output = {
          artist: {
            artistName: results[0].artistName,
            realName: results[0].realName,
            city: results[0].city,
            activeSince: results[0].activeSince
          },
          release: {
            releaseTitle: results[0].releaseTitle,
            releaseYear: results[0].releaseYear,
            label: results[0].label
          },
          tracks: []
        };

        // Populate the tracks array
        results.forEach((row) => {
          output.tracks.push({ trackTitle: row.trackTitle });
        });

        res.json(output);
      } else {
        res.status(404).json({ error: 'Release not found' });
      }
    }
  });
});

// GET search for releases eg http://localhost:3333/releases/search/query?q=
releasesRouter.get("/search/query", (req, res) => {
  const query = req.query.q;
  const queryString = /*sql*/ `
    SELECT * 
    FROM releases
    WHERE releaseTitle LIKE ?
    ORDER BY releaseTitle`;

  const values = [`%${query}%`];
  
  connection.query(queryString, values, (error, results) => {
    if (error) {
      console.error(error);

      res.status(500).json({ 
        error: 'An error occurred while searching for releases', 
        details: error.message
      });
    } else {
      res.json(results);
    }
  });
});

//---- CREATE HTTP ----//

// Create a new release and link it to an artist by artistId
releasesRouter.post("/", (req, res) => {
  const { releaseTitle, releaseYear, label, artistId } = req.body;

  if (!releaseTitle || !releaseYear || !label || !artistId) {
    return res.status(400).json({ error: 'ReleaseTitle, ReleaseYear, Label, and ArtistId are required' });
  }

  const checkArtistQuery = 'SELECT artistId FROM `artists` WHERE artistId = ?';

  connection.query(checkArtistQuery, [artistId], (checkArtistErr, checkArtistResults) => {
    if (checkArtistErr) {
      console.log(checkArtistErr);
      return res.status(500).json({ error: 'An error occurred while checking the artist' });
    }

    if (checkArtistResults.length === 0) {
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

// POST route to create a complete album with artist and tracks
releasesRouter.post("/create-release", (req, res) => {
  const { artistName, realName, city, activeSince, releaseInfo } = req.body;

  if (!artistName || !releaseInfo || !Array.isArray(releaseInfo) || releaseInfo.length === 0) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Check if the artist exists in the database by artistName
  const checkArtistQuery = 'SELECT artistId FROM `artists` WHERE artistName = ?';

  connection.query(checkArtistQuery, [artistName], (checkArtistErr, checkArtistResults) => {
    if (checkArtistErr) {
      console.log(checkArtistErr);
      return res.status(500).json({ error: 'An error occurred while checking the artist' });
    }

    let artistId;

    // If the artist exists, use the existing artistId
    if (checkArtistResults.length > 0) {
      artistId = checkArtistResults[0].artistId;
    } else {
      // If the artist doesn't exist, create a new artist
      const insertArtistQuery = 'INSERT INTO `artists` (artistName, realName, city, activeSince) VALUES (?, ?, ?, ?)';
      connection.query(insertArtistQuery, [artistName, realName, city, activeSince], (insertArtistErr, artistResult) => {
        if (insertArtistErr) {
          console.log(insertArtistErr);
          return res.status(500).json({ error: 'An error occurred while creating the artist' });
        }
        artistId = artistResult.insertId;
      });
    }

    // Iterate through each release in the releaseInfo array
    const trackInsertPromises = releaseInfo.map(release => {
      const { releaseTitle, releaseYear, label, tracks } = release;

      return new Promise((resolve, reject) => {
        // Create a new release in the releases table
        const insertReleaseQuery = 'INSERT INTO `releases` (releaseTitle, releaseYear, label) VALUES (?, ?, ?)';
        connection.query(insertReleaseQuery, [releaseTitle, releaseYear, label], (insertReleaseErr, releaseResult) => {
          if (insertReleaseErr) {
            console.log(insertReleaseErr);
            reject('An error occurred while creating the release');
          }
          const releaseId = releaseResult.insertId;

          // Iterate through each track in the tracks array
          const trackInsertPromises = tracks.map(track => {
            return new Promise((resolveTrack, rejectTrack) => {
              const { trackTitle } = track;

              // Create a new track in the tracks table
              const insertTrackQuery = 'INSERT INTO `tracks` (trackTitle) VALUES (?)';
              connection.query(insertTrackQuery, [trackTitle], (insertTrackErr, trackResult) => {
                if (insertTrackErr) {
                  console.log(insertTrackErr);
                  rejectTrack('An error occurred while creating the track');
                }
                const trackId = trackResult.insertId;

                // Link the track to the release
                const linkReleaseTrackQuery = 'INSERT INTO `releaseTrack` (releaseId, trackId) VALUES (?, ?)';
                connection.query(linkReleaseTrackQuery, [releaseId, trackId], (linkErr, linkResult) => {
                  if (linkErr) {
                    console.log(linkErr);
                    rejectTrack('An error occurred while linking the track and release');
                  }
                  resolveTrack();
                });
              });
            });
          });

          // Wait for all track insertions to complete
          Promise.all(trackInsertPromises)
            .then(() => {
              // Link the artist to the release in the artistRelease table
              const linkArtistReleaseQuery = 'INSERT INTO `artistRelease` (artistId, releaseId) VALUES (?, ?)';
              connection.query(linkArtistReleaseQuery, [artistId, releaseId], (linkErr, linkResult) => {
                if (linkErr) {
                  console.log(linkErr);
                  reject('An error occurred while linking the artist and release');
                }
                resolve();
              });
            })
            .catch(err => reject(err));
        });
      });
    });

    // Wait for all release insertions to complete
    Promise.all(trackInsertPromises)
      .then(() => {
        res.status(201).json({ message: 'Album created successfully' });
      })
      .catch(err => {
        console.log(err);
        res.status(500).json({ error: err });
      });
  });
});

//---- PUT HTTP ----//

// Update an existing release by releaseId
releasesRouter.put("/:releaseId", (req, res) => {
  const releaseId = req.params.releaseId;
  const { releaseTitle, releaseYear, label } = req.body;

  if (!releaseTitle || !releaseYear || !label) {
    return res.status(400).json({ error: 'ReleaseTitle, ReleaseYear, and Label are required' });
  }

  // Check if the release with the specified releaseId exists
  const checkReleaseQuery = 'SELECT releaseId FROM `releases` WHERE releaseId = ?';

  connection.query(checkReleaseQuery, [releaseId], (checkReleaseErr, checkReleaseResults) => {
    if (checkReleaseErr) {
      console.log(checkReleaseErr);
      return res.status(500).json({ error: 'An error occurred while checking the release' });
    }

    if (checkReleaseResults.length === 0) {
      return res.status(404).json({ error: 'Release not found' });
    }

    // Update the existing release in the releases table
    const updateReleaseQuery = 'UPDATE `releases` SET releaseTitle = ?, releaseYear = ?, label = ? WHERE releaseId = ?';
    
    connection.query(updateReleaseQuery, [releaseTitle, releaseYear, label, releaseId], (updateReleaseErr, result) => {
      if (updateReleaseErr) {
        console.log(updateReleaseErr);
        res.status(500).json({ error: 'An error occurred while updating the release' });
      } else {
        res.status(200).json({ releaseId, message: 'Release updated successfully' });
      }
    });
  });
});


//---- DELETE HTTP ----//

// Delete a release by releaseId, including related data
releasesRouter.delete("/:releaseId", (req, res) => {
  const releaseId = req.params.releaseId;

  const checkQuery = 'SELECT releaseId FROM `releases` WHERE releaseId = ?';

  connection.query(checkQuery, [releaseId], (checkErr, checkResults) => {
    if (checkErr) {
      console.log(checkErr);
      return res.status(500).json({ error: 'An error occurred while checking the release' });
    }

    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Release not found' });
    }

    // Delete related data in releaseTrack and artistRelease tables
    const deleteRelatedDataQuery = `
      DELETE FROM releaseTrack WHERE releaseId = ?;
      DELETE FROM artistRelease WHERE releaseId = ?;
    `;

    connection.query(deleteRelatedDataQuery, [releaseId, releaseId], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.log(deleteErr);
        res.status(500).json({ error: 'An error occurred while deleting related data' });
      } else {

        const deleteReleaseQuery = 'DELETE FROM `releases` WHERE releaseId = ?';

        connection.query(deleteReleaseQuery, [releaseId], (deleteReleaseErr, deleteReleaseResult) => {
          if (deleteReleaseErr) {
            console.log(deleteReleaseErr);
            res.status(500).json({ error: 'An error occurred while deleting the release' });
          } else {
            res.status(200).json({ message: 'Release and related data deleted successfully' });
          }
        });
      }
    });
  });
});

export { releasesRouter };
