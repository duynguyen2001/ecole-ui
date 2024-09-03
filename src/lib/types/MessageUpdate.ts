import type { ToolCall, ToolResult } from "$lib/types/Tool";
import type { WebSearchSource } from "$lib/types/WebSearch";

export type MessageUpdate =
	| MessageStatusUpdate
	| MessageTitleUpdate
	| MessageToolUpdate
	| MessageWebSearchUpdate
	| MessageStreamUpdate
	| MessageFileUpdate
	| MessageFinalAnswerUpdate
	| MessageVideoUpdate;

export enum MessageUpdateType {
	Status = "status",
	Title = "title",
	Tool = "tool",
	WebSearch = "webSearch",
	Stream = "stream",
	File = "file",
	FinalAnswer = "finalAnswer",
	Video = "video",
}

// Status
export enum MessageUpdateStatus {
	Started = "started",
	Error = "error",
	Finished = "finished",
}
export interface MessageStatusUpdate {
	type: MessageUpdateType.Status;
	status: MessageUpdateStatus;
	message?: string;
}

// Web search
export enum MessageWebSearchUpdateType {
	Update = "update",
	Error = "error",
	Sources = "sources",
	Finished = "finished",
}
export interface BaseMessageWebSearchUpdate<TSubType extends MessageWebSearchUpdateType> {
	type: MessageUpdateType.WebSearch;
	subtype: TSubType;
}
export interface MessageWebSearchErrorUpdate
	extends BaseMessageWebSearchUpdate<MessageWebSearchUpdateType.Error> {
	message: string;
	args?: string[];
}
export interface MessageWebSearchGeneralUpdate
	extends BaseMessageWebSearchUpdate<MessageWebSearchUpdateType.Update> {
	message: string;
	args?: string[];
}
export interface MessageWebSearchSourcesUpdate
	extends BaseMessageWebSearchUpdate<MessageWebSearchUpdateType.Sources> {
	message: string;
	sources: WebSearchSource[];
}
export type MessageWebSearchFinishedUpdate =
	BaseMessageWebSearchUpdate<MessageWebSearchUpdateType.Finished>;
export type MessageWebSearchUpdate =
	| MessageWebSearchErrorUpdate
	| MessageWebSearchGeneralUpdate
	| MessageWebSearchSourcesUpdate
	| MessageWebSearchFinishedUpdate;

// Tool
export enum MessageToolUpdateType {
	/** A request to call a tool alongside it's parameters */
	Call = "call",
	/** The result of a tool call */
	Result = "result",
	/** Error while running tool */
	Error = "error",
}
interface MessageToolBaseUpdate<TSubType extends MessageToolUpdateType> {
	type: MessageUpdateType.Tool;
	subtype: TSubType;
	uuid: string;
}
export interface MessageToolCallUpdate extends MessageToolBaseUpdate<MessageToolUpdateType.Call> {
	call: ToolCall;
}
export interface MessageToolResultUpdate
	extends MessageToolBaseUpdate<MessageToolUpdateType.Result> {
	result: ToolResult;
}
export interface MessageToolErrorUpdate extends MessageToolBaseUpdate<MessageToolUpdateType.Error> {
	message: string;
}
export type MessageToolUpdate =
	| MessageToolCallUpdate
	| MessageToolResultUpdate
	| MessageToolErrorUpdate;

// Everything else
export interface MessageTitleUpdate {
	type: MessageUpdateType.Title;
	title: string;
}
export interface MessageStreamUpdate {
	type: MessageUpdateType.Stream;
	token: string;
}
export interface MessageFileUpdate {
	type: MessageUpdateType.File;
	name: string;
	sha: string;
	mime: string;
}
export interface MessageFinalAnswerUpdate {
	type: MessageUpdateType.FinalAnswer;
	text: string;
	interrupted: boolean;
}

export interface MessageVideoUpdate {
	type: MessageUpdateType.Video;
	url: string;
}