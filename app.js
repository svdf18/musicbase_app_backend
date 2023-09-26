import express from "express";
import cors from "cors";
import { artistsRouter } from "./routes/artists.js";
import { releasesRouter } from "./routes/releases.js";
import { tracksRouter } from "./routes/tracks.js";

const app = express();
const port = process.env.PORT || 3333;

app.use(express.json());
app.use(cors());
app.use("/artists", artistsRouter);
app.use("/releases", releasesRouter);
app.use("/tracks", tracksRouter);

app.get("/", (req, res) => {
  res.send("Musicbase");
});

app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});
