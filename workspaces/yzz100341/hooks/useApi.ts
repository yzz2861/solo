'use client';

import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';
import useSWRMutation, { type SWRMutationConfiguration, type SWRMutationResponse } from 'swr/mutation';

export type Student = {
  id: string;
  name: string;
  studentNo: string;
  classId: string;
  defaultRouteId: string;
  defaultStopId: string;
  class: { id: string; name: string };
  defaultRoute: { id: string; name: string };
  defaultStop: { id: string; name: string };
  parentLinks?: Array<{ parent: { id: string; name: string; email: string } }>;
};

export type BusStop = {
  id: string;
  name: string;
  address: string;
  routeId: string;
  sequence: number;
};

export type BusRoute = {
  id: string;
  name: string;
  plateNo: string;
  capacity: number;
  stops: BusStop[];
};

export type ChangeRequest = {
  id: string;
  studentId: string;
  date: string;
  originalRouteId: string;
  originalStopId: string;
  newRouteId: string;
  newStopId: string;
  reason: string | null;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'MERGED';
  mergedToId: string | null;
  confirmedById: string | null;
  confirmedByName: string | null;
  confirmedAt: string | null;
  rejectComment: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    name: string;
    studentNo: string;
    classId: string;
  };
  originalRoute: { id: string; name: string };
  originalStop: { id: string; name: string };
  newRoute: { id: string; name: string };
  newStop: { id: string; name: string };
};

export type ApiError = {
  error: string;
};

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data as T;
};

export function useStudents(options?: SWRConfiguration<Student[], Error>): SWRResponse<Student[], Error> {
  return useSWR<Student[], Error>('/api/students', fetcher, options);
}

export function useRoutes(options?: SWRConfiguration<BusRoute[], Error>): SWRResponse<BusRoute[], Error> {
  return useSWR<BusRoute[], Error>('/api/routes', fetcher, options);
}

export function useChanges(
  params?: { date?: string; status?: string; studentId?: string },
  options?: SWRConfiguration<ChangeRequest[], Error>
): SWRResponse<ChangeRequest[], Error> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.status) query.set('status', params.status);
  if (params?.studentId) query.set('studentId', params.studentId);
  const qs = query.toString();
  const key = qs ? `/api/changes?${qs}` : '/api/changes';
  return useSWR<ChangeRequest[], Error>(key, fetcher, options);
}

export type CreateChangeInput = {
  studentId: string;
  date: string;
  newRouteId: string;
  newStopId: string;
  reason?: string;
};

export function useCreateChange(
  options?: SWRMutationConfiguration<ChangeRequest, Error, string, CreateChangeInput>
): SWRMutationResponse<ChangeRequest, Error, string, CreateChangeInput> {
  return useSWRMutation<ChangeRequest, Error, string, CreateChangeInput>(
    '/api/changes',
    async (url: string, { arg }: { arg: CreateChangeInput }) => {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '提交失败');
      }
      return data as ChangeRequest;
    },
    options
  );
}
