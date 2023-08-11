import type { DependencyList} from "react";
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

export interface PromisedValueGetter<Value> {
  (): Value;
  promise: Promise<Value>;
}

export interface PendingPromise<Value> extends PromiseLike<Value> {
  status: "pending";
}

export interface FulfilledPromise<Value> extends PromiseLike<Value> {
  status: "fulfilled";
  value: Value;
}

export interface RejectedPromise<Value> extends PromiseLike<Value> {
  status: "rejected";
  error: unknown;
}

export type ObservedPromise<Value> = PendingPromise<Value> | FulfilledPromise<Value> | RejectedPromise<Value>;

const isObservedPromise = <Value>(promise: PromiseLike<Value>): promise is ObservedPromise<Value> => {
  return "status" in promise;
};

const observePromise = <Value>(promise: PromiseLike<Value>): ObservedPromise<Value> => {
  const observedPromise: ObservedPromise<Value> = Object.assign(promise, { status: "pending" as  const });

  void (async () => {
    try {
      const value = await promise;
      void Object.assign(observedPromise, { status: "fulfilled" as const, value });
    } catch (error) {
      void Object.assign(observedPromise, { status: "rejected" as const, error });
    }
  })();

  return observedPromise;
};

export const usePromise = <Value>(promise: Promise<Value>): Value => {
  const observedPromise = isObservedPromise(promise) ? promise : observePromise(promise);

  switch (observedPromise.status) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    case "pending": throw observedPromise;
    case "fulfilled": return observedPromise.value;
    case "rejected": throw observedPromise.error;
  }
};
