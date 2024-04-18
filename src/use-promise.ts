import type { DependencyList } from "react";
import { useRef } from "react";

const noValue = Symbol.for("no-value");

export const useSemanticMemo = <Value>(factory: () => Value, dependencies: DependencyList): Value => {
  const previousValueRef = useRef<Value | typeof noValue>(noValue);
  const previousDependenciesRef = useRef<DependencyList | null>(null);
  const previousDependencies = previousDependenciesRef.current;

  if (previousValueRef.current === noValue
    || previousDependencies === null
    || previousDependencies.length !== dependencies.length
    || previousDependencies.some((value, index) => !Object.is(value, dependencies[index]))
  ) {
    previousValueRef.current = factory();
    previousDependenciesRef.current = dependencies;
  }
  return previousValueRef.current;
};

export interface Pending {
  status: "pending";
}

const pending: Pending = { status: "pending" };

export interface Fulfilled<Value> {
  status: "fulfilled";
  value: Value;
}

export interface Rejected {
  status: "rejected";
  error: unknown;
}

export type PromiseState<Value> = Pending | Fulfilled<Value> | Rejected;

const promiseStateMap = new WeakMap<PromiseLike<any>, PromiseState<any>>();

const observePromise = <Value>(promise: PromiseLike<Value>): void => {
  if (promiseStateMap.has(promise)) {
    return;
  }

  promiseStateMap.set(promise, pending);

  void (async () => {
    try {
      const value = await promise;
      promiseStateMap.set(promise, { status: "fulfilled", value });
    } catch (error) {
      promiseStateMap.set(promise, { status: "rejected", error });
    }
  })();
};

export const usePromise = <Value>(promise: Promise<Value>): Value => {
  observePromise(promise);
  const promiseState: PromiseState<Value> = promiseStateMap.get(promise) ?? pending;

  switch (promiseState.status) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    case "pending": throw promise;
    case "fulfilled": return promiseState.value;
    case "rejected": throw promiseState.error;
  }
};

export const useAsyncOperation = <Result>(
  operation: (params: { abortSignal: AbortSignal }) => Promise<Result>,
  dependencies: DependencyList,
  options: { timeout: number; cacheLength: number; }
): Result => {
  const promise = operation({ abortSignal: new AbortController().signal });

  return usePromise(promise);
};
