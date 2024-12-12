import { writable } from "svelte/store";

// MANAGE STATE OF ANNOTATIONS

// disable/enable adjustments of annotations
export const isLocked = writable<boolean[]>([]);

export const changeLockState = (index: number) => {
	console.log("changeLockState", index);
	isLocked.update((locked) => locked.map((lock, i) => (i === index ? !lock : lock)));
};

export const clearLockState = () => {
	isLocked.update(() => []);
};

export const setUpLockState = (length: number) => {
	isLocked.update(() => Array(length).fill(false));
};

// disable/enable visibility of annotations
export const isVisible = writable<boolean[]>([]);
export const changeVisibility = (index: number) => {
	isVisible.update((visible) => visible.map((vis, i) => (i === index ? !vis : vis)));
};

export const clearVisibility = () => {
	isVisible.update(() => []);
};

export const setUpVisibility = (length: number) => {
	isVisible.update(() => Array(length).fill(true));
};

export const clearAll = () => {
	clearLockState();
	clearVisibility();
};

// HANDLE ACTIONS ON ANNOTATIONS
