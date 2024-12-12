import { Image } from "svelte-konva";
import { writable } from "svelte/store";
import type { ImageData } from "./types";

// MANAGE ACTIONS THAT CREATE A SNAPSHOT
export const snapshots = writable<ImageData[][]>([]); // history of all the snapshots, updated when there is a change in any image
export const images = writable<ImageData[]>([]); // current snapshot
