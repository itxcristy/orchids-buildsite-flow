import { getApiEndpoint } from '@/config/services';
import type { PlanFeature, SubscriptionPlan } from '@/hooks/usePlanManagement';

interface ApiEnvelopeSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

interface ApiEnvelopeError {
  success: false;
  error: {
    code?: string;
    message: string;
    details?: string;
  };
  message?: string;
}

type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeError;

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('auth_token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let parsed: ApiEnvelope<T>;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return JSON.parse(text) as T;
  }

  if (!('success' in parsed)) {
    return parsed as unknown as T;
  }

  if (!parsed.success) {
    // Type guard: if success is false, it's an error response
    const errorResponse = parsed as { success: false; error?: string; message?: string };
    const message = errorResponse.error || errorResponse.message || 'Request failed';
    throw new Error(message);
  }

  return parsed.data;
}

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const endpoint = getApiEndpoint('/system/plans');
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch plans: ${response.status}`);
  }
  const data = await parseJson<{ plans: SubscriptionPlan[] }>(response);
  return data.plans || [];
}

export async function fetchFeatures(): Promise<PlanFeature[]> {
  const endpoint = getApiEndpoint('/system/features');
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch features: ${response.status}`);
  }
  const data = await parseJson<{ features: PlanFeature[] }>(response);
  return data.features || [];
}

export async function createPlanApi(
  payload: Omit<SubscriptionPlan, 'id'>
): Promise<SubscriptionPlan> {
  const endpoint = getApiEndpoint('/system/plans');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ plan: SubscriptionPlan }>(response);
  return data.plan;
}

export async function updatePlanApi(
  planId: string,
  updates: Partial<SubscriptionPlan>
): Promise<SubscriptionPlan> {
  const endpoint = getApiEndpoint(`/system/plans/${encodeURIComponent(planId)}`);
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await parseJson<{ plan: SubscriptionPlan }>(response);
  return data.plan;
}

export async function deactivatePlanApi(planId: string): Promise<void> {
  const endpoint = getApiEndpoint(`/system/plans/${encodeURIComponent(planId)}`);
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJson<unknown>(response);
}

export async function createFeatureApi(
  payload: Omit<PlanFeature, 'id' | 'enabled'>
): Promise<PlanFeature> {
  const endpoint = getApiEndpoint('/system/features');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ feature: PlanFeature }>(response);
  return { ...data.feature, enabled: false };
}

export async function updateFeatureApi(
  featureId: string,
  updates: Partial<Omit<PlanFeature, 'id' | 'enabled'>>
): Promise<PlanFeature> {
  const endpoint = getApiEndpoint(
    `/system/features/${encodeURIComponent(featureId)}`
  );
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await parseJson<{ feature: PlanFeature }>(response);
  return { ...data.feature, enabled: true };
}

export async function deleteFeatureApi(featureId: string): Promise<void> {
  const endpoint = getApiEndpoint(
    `/system/features/${encodeURIComponent(featureId)}`
  );
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  await parseJson<unknown>(response);
}

