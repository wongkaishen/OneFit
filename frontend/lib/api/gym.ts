import { request, upload } from "./client";
import type {
  AIExercise,
  CommunityPost,
  GroupSummary, GroupChatMessage,
  EducationalContentOut,
  FeedPost, ReportIn,
  MemberOut, FriendOut, FriendRequests,
  Exercise,
  FitnessProfile, FitnessProfileIn,
  GymActivityIn, GymActivityLog,
  GymDashboard,
  GymDietIn, GymDietLog,
  GymFeedback,
  GymMilestone,
  GymProgressEntry, GymProgressIn,
  MealPlanOut,
  WorkoutPlan,
  WorkoutSession, WorkoutSessionIn,
} from "./types";

// Profile
export const getProfile = () => request<FitnessProfile>("/gym/profile");
export const updateProfile = (body: FitnessProfileIn) =>
  request<FitnessProfile>("/gym/profile", { method: "PUT", body: JSON.stringify(body) });

// Workout plans
export const listPlans = () => request<WorkoutPlan[]>("/gym/plans");
export const createPlan = (goal: string) =>
  request<WorkoutPlan>("/gym/plans", { method: "POST", body: JSON.stringify({ goal }) });
export const updatePlan = (id: string, body: { goal?: string; status?: string }) =>
  request<WorkoutPlan>(`/gym/plans/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const discardPlan = (id: string) =>
  request<void>(`/gym/plans/${id}`, { method: "DELETE" });
export const listPlanExercises = (id: string) =>
  request<Exercise[]>(`/gym/plans/${id}/exercises`);

// Activity logging
export const logActivity = (body: GymActivityIn) =>
  request<GymActivityLog>("/gym/activity", { method: "POST", body: JSON.stringify(body) });

// Diet logging
export const logDiet = (body: GymDietIn) =>
  request<GymDietLog>("/gym/diet", { method: "POST", body: JSON.stringify(body) });

// Dashboard — today's calorie balance
export const getDashboard = (day?: string) =>
  request<GymDashboard>(`/gym/dashboard${day ? `?day=${day}` : ""}`);

// Progress + milestones
export const listProgress = () => request<GymProgressEntry[]>("/gym/progress");
export const addProgress = (body: GymProgressIn) =>
  request<GymProgressEntry>("/gym/progress", { method: "POST", body: JSON.stringify(body) });
export const listMilestones = () => request<GymMilestone[]>("/gym/milestones");

// Meal plans published to me by a wellness specialist
export const listMealPlans = () => request<MealPlanOut[]>("/gym/meal-plans");

// Feedback addressed to me by a wellness specialist
export const listFeedback = () => request<GymFeedback[]>("/gym/feedback");

// Scheduled sessions
export const listSessions = () => request<WorkoutSession[]>("/gym/sessions");
export const scheduleSession = (body: WorkoutSessionIn) =>
  request<WorkoutSession>("/gym/sessions", { method: "POST", body: JSON.stringify(body) });

// Progress photo upload
export const uploadProgressPhoto = (file: File) =>
  upload<{ photo_url: string }>("/gym/progress/photo", file);

// Accept AI-generated workout plan (A5)
export const acceptAiPlan = (goal: string, exercises: AIExercise[]) =>
  request<WorkoutPlan>("/gym/plans/ai-accept", { method: "POST", body: JSON.stringify({ goal, exercises }) });

// Educational content library (published content from any specialist)
export const gymListContent = (category?: string) =>
  request<EducationalContentOut[]>(
    `/gym/content${category ? `?category=${encodeURIComponent(category)}` : ""}`,
  );

// Social feed (issue #3 P1)
export const gymListFeed = () => request<FeedPost[]>("/gym/feed");
export const gymCreateFeedPost = (content: string, image_url?: string | null) =>
  request<FeedPost>("/gym/feed", { method: "POST", body: JSON.stringify({ content, image_url }) });
export const gymUploadFeedPhoto = (file: File) =>
  upload<{ image_url: string }>("/gym/feed/photo", file);
export const gymReport = (body: ReportIn) =>
  request<{ report_id: string; status: string }>("/gym/reports", {
    method: "POST", body: JSON.stringify(body),
  });

// Members directory + friends (issue #3 P2)
export const gymListMembers = (query?: string) =>
  request<MemberOut[]>(`/gym/members${query ? `?query=${encodeURIComponent(query)}` : ""}`);
export const gymGetMember = (id: string) => request<MemberOut>(`/gym/members/${id}`);
export const gymListFriends = () => request<FriendOut[]>("/gym/friends");
export const gymListFriendRequests = () => request<FriendRequests>("/gym/friends/requests");
export const gymSendFriendRequest = (addressee_id: string) =>
  request<{ friendship_id: string; status: string }>("/gym/friends/requests", {
    method: "POST", body: JSON.stringify({ addressee_id }),
  });
export const gymAcceptFriendRequest = (id: string) =>
  request<{ friendship_id: string; status: string }>(`/gym/friends/requests/${id}/accept`, { method: "POST" });
export const gymDeclineFriendRequest = (id: string) =>
  request<{ friendship_id: string; status: string }>(`/gym/friends/requests/${id}/decline`, { method: "POST" });
export const gymRemoveFriend = (userId: string) =>
  request<void>(`/gym/friends/${userId}`, { method: "DELETE" });

// Community groups: browse, join, post, chat (A28 + issue #3 P3)
export const gymListGroups = () => request<GroupSummary[]>("/gym/community/groups");
export const gymJoinGroup = (id: string) =>
  request<{ group_id: string; is_member: boolean }>(`/gym/community/groups/${id}/join`, { method: "POST" });
export const gymLeaveGroup = (id: string) =>
  request<void>(`/gym/community/groups/${id}/join`, { method: "DELETE" });
export const gymListPosts = (id: string) => request<CommunityPost[]>(`/gym/community/groups/${id}/posts`);
export const gymCreatePost = (id: string, content: string) =>
  request<CommunityPost>(`/gym/community/groups/${id}/posts`, { method: "POST", body: JSON.stringify({ content }) });
export const gymListGroupChat = (id: string) =>
  request<GroupChatMessage[]>(`/gym/community/groups/${id}/chat`);
export const gymSendGroupChat = (id: string, body: string) =>
  request<GroupChatMessage>(`/gym/community/groups/${id}/chat`, { method: "POST", body: JSON.stringify({ body }) });
