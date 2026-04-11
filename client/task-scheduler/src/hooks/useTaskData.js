import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { extractApiErrorMessage } from '../utils/api.js';
import { createAuthConfig } from '../utils/authSession.js';
import {
    normalizeTask,
    normalizeTasks,
    projectNameToProjectObject,
    projectToProjectId,
    projectToProjectName,
} from '../utils/taskAdapters.js';

function sortProjectNames(projects) {
    return [...new Set(projects.map((project) => project?.projectName).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
}

function upsertTask(collection, task) {
    const next = collection.filter((item) => item.taskId !== task.taskId);
    next.push(task);
    return next;
}

function useTaskData(user) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const [tasks, setTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [allTagObjects, setAllTagObjects] = useState([]);
    const [availableProjects, setAvailableProjects] = useState([]);
    const [allProjectObjects, setAllProjectObjects] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const refreshTags = useCallback(async () => {
        const response = await axios.get(`${backendUrl}/api/tags`, createAuthConfig());
        const nextTags = response.data || [];
        setAllTagObjects(nextTags);
        setAvailableTags(nextTags.map((tag) => tag.tagName).filter(Boolean));
        return nextTags;
    }, [backendUrl]);

    const refreshProjects = useCallback(async () => {
        const response = await axios.get(`${backendUrl}/api/projects`, createAuthConfig());
        const nextProjects = response.data || [];
        setAllProjectObjects(nextProjects);
        setAvailableProjects(sortProjectNames(nextProjects));
        return nextProjects;
    }, [backendUrl]);

    const refreshTasks = useCallback(async () => {
        const response = await axios.get(`${backendUrl}/api/tasks`, createAuthConfig());
        const nextTasks = normalizeTasks(response.data);
        setTasks(nextTasks);
        return nextTasks;
    }, [backendUrl]);

    const refreshCompletedTasks = useCallback(async () => {
        const response = await axios.get(`${backendUrl}/api/tasks/completed`, createAuthConfig());
        const nextCompletedTasks = normalizeTasks(response.data);
        setCompletedTasks(nextCompletedTasks);
        return nextCompletedTasks;
    }, [backendUrl]);

    const refetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [activeRes, completedRes, projectsRes, tagsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/tasks`, createAuthConfig()),
                axios.get(`${backendUrl}/api/tasks/completed`, createAuthConfig()),
                axios.get(`${backendUrl}/api/projects`, createAuthConfig()),
                axios.get(`${backendUrl}/api/tags`, createAuthConfig()),
            ]);

            const nextProjects = projectsRes.data || [];
            const nextTags = tagsRes.data || [];

            setTasks(normalizeTasks(activeRes.data));
            setCompletedTasks(normalizeTasks(completedRes.data));
            setAllProjectObjects(nextProjects);
            setAvailableProjects(sortProjectNames(nextProjects));
            setAllTagObjects(nextTags);
            setAvailableTags(nextTags.map((tag) => tag.tagName).filter(Boolean));
        } catch (nextError) {
            setError(extractApiErrorMessage(nextError, 'Failed to load task data.'));
            throw nextError;
        } finally {
            setLoading(false);
        }
    }, [backendUrl]);

    useEffect(() => {
        if (!user) {
            setTasks([]);
            setCompletedTasks([]);
            setAllProjectObjects([]);
            setAvailableProjects([]);
            setAllTagObjects([]);
            setAvailableTags([]);
            setLoading(false);
            return;
        }

        refetchAll().catch(() => {});
    }, [refetchAll, user]);

    const createTask = useCallback(async (payload) => {
        const response = await axios.post(`${backendUrl}/api/tasks`, payload, createAuthConfig());
        const createdTask = normalizeTask(response.data || payload);
        setTasks((prev) => [...prev, createdTask]);
        await Promise.allSettled([refreshTags(), refreshProjects()]);
        return createdTask;
    }, [backendUrl, refreshProjects, refreshTags]);

    const updateTask = useCallback(async (payload) => {
        const response = await axios.put(`${backendUrl}/api/tasks`, payload, createAuthConfig());
        const updatedTask = normalizeTask(response.data || payload);
        setTasks((prev) => prev.map((task) => (task.taskId === updatedTask.taskId ? updatedTask : task)));
        setCompletedTasks((prev) => prev.map((task) => (task.taskId === updatedTask.taskId ? updatedTask : task)));
        await Promise.allSettled([refreshTags(), refreshProjects()]);
        return updatedTask;
    }, [backendUrl, refreshProjects, refreshTags]);

    const deleteTask = useCallback(async (taskId) => {
        await axios.delete(`${backendUrl}/api/tasks/${taskId}`, createAuthConfig());
        setTasks((prev) => prev.filter((task) => task.taskId !== taskId));
        setCompletedTasks((prev) => prev.filter((task) => task.taskId !== taskId));
    }, [backendUrl]);

    const completeTask = useCallback(async (taskId) => {
        const response = await axios.put(`${backendUrl}/api/tasks/${taskId}/complete`, {}, createAuthConfig());
        const completedTask = normalizeTask(response.data || {});
        setTasks((prev) => prev.filter((task) => task.taskId !== taskId));
        setCompletedTasks((prev) => upsertTask(prev, completedTask));
        return completedTask;
    }, [backendUrl]);

    const reopenTask = useCallback(async (taskId) => {
        const response = await axios.put(`${backendUrl}/api/tasks/${taskId}/reopen`, {}, createAuthConfig());
        const reopenedTask = normalizeTask(response.data || {});
        setCompletedTasks((prev) => prev.filter((task) => task.taskId !== taskId));
        setTasks((prev) => upsertTask(prev, reopenedTask));
        return reopenedTask;
    }, [backendUrl]);

    const createProject = useCallback(async ({ projectColor, projectName }) => {
        const response = await axios.post(
            `${backendUrl}/api/projects`,
            { projectName, projectColor },
            createAuthConfig(),
        );
        const createdProject = response.data || { projectName, projectColor };
        setAllProjectObjects((prev) => {
            const exists = prev.some((project) => (
                project.projectName?.toLowerCase() === createdProject.projectName?.toLowerCase()
            ));
            return exists ? prev : [...prev, createdProject];
        });
        setAvailableProjects((prev) => (
            [...new Set([...prev, createdProject.projectName].filter(Boolean))]
                .sort((a, b) => a.localeCompare(b))
        ));
        return createdProject;
    }, [backendUrl]);

    const deleteProject = useCallback(async (project) => {
        const projectIdentifier = project?.projectId || project?.projectName;
        await axios.delete(`${backendUrl}/api/projects/${encodeURIComponent(projectIdentifier)}`, createAuthConfig());

        setAllProjectObjects((prev) => prev.filter((currentProject) => (
            currentProject.projectId !== project.projectId
            && currentProject.projectName !== project.projectName
        )));
        setAvailableProjects((prev) => prev.filter((projectName) => projectName !== project.projectName));
        setTasks((prev) => prev.filter((task) => (
            projectToProjectId(task.project) !== project.projectId
            && projectToProjectName(task.project) !== project.projectName
        )));
        setCompletedTasks((prev) => prev.filter((task) => (
            projectToProjectId(task.project) !== project.projectId
            && projectToProjectName(task.project) !== project.projectName
        )));
    }, [backendUrl]);

    const fetchTaskDetails = useCallback(async (taskId) => {
        const response = await axios.get(`${backendUrl}/api/tasks/${taskId}`, createAuthConfig());
        return normalizeTask(response.data || {});
    }, [backendUrl]);

    const resolveProjectObject = useCallback((projectName) => (
        projectNameToProjectObject(projectName, allProjectObjects)
    ), [allProjectObjects]);

    return {
        tasks,
        completedTasks,
        availableTags,
        allTagObjects,
        availableProjects,
        allProjectObjects,
        error,
        setError,
        loading,
        refetchAll,
        refreshTasks,
        refreshCompletedTasks,
        refreshTags,
        refreshProjects,
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        reopenTask,
        createProject,
        deleteProject,
        fetchTaskDetails,
        resolveProjectObject,
    };
}

export default useTaskData;
