"use client";

import { createContext, useContext } from "react";

export const STUDENT_OPENING_GREETING_ACTION = "student-opening-greeting";

export const StudentChatContext = createContext<{ studentId?: string }>({});
export const useStudentChat = () => useContext(StudentChatContext);
