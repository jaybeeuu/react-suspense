import { asError, assertIsNotNullish } from "@jaybeeuu/utilities";
import type { DependencyList } from "react";
import { useMemo, useRef } from "react";

const noValue = Symbol.for("no-value");

export const useSynchronousEffect = (effect: (() => void) | (() => () => void), dependencies: DependencyList): void => {
  const previousDependenciesRef = useRef<DependencyList | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  const previousDestructorRef = useRef<void | (() => void)>();
  const previousDependencies = previousDependenciesRef.current;

  if (previousDependencies === null
    || previousDependencies.length !== dependencies.length
    || previousDependencies.some((value, index) => !Object.is(value, dependencies[index]))
  ) {
    previousDestructorRef.current?.();
    const destructor = effect();
    previousDestructorRef.current = destructor;
    previousDependenciesRef.current = dependencies;
  }
};

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

export const usePromise = <Value>(promiseFactory: () => Promise<Value>, dependencies: DependencyList): PromisedValueGetter<Value> => {
  const errorRef = useRef<Error | typeof noValue>(noValue);
  const valueRef = useRef<Value | typeof noValue>(noValue);

  const promise = useSemanticMemo(promiseFactory, dependencies);

  useSynchronousEffect(() => {
    errorRef.current = noValue;
    valueRef.current = noValue;
    const isCurrent = { current: true };

    void (async () => {
      try {
        const value = await promise;
        if (isCurrent.current) {
          valueRef.current = value;
        }
      } catch (error) {
        if (isCurrent.current) {
          errorRef.current = asError(error);
        }
      }
    })();

    return () => { isCurrent.current = false; };
  }, [promise]);

  return useMemo((): PromisedValueGetter<Value> => {
    const valueGetter = (): Value => {
      if (errorRef.current !== noValue) {
        throw errorRef.current;
      }

      assertIsNotNullish(promise);

      if (valueRef.current === noValue) {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw promise;
      }

      return valueRef.current;
    };

    valueGetter.promise = promise;

    return valueGetter;
  }, [promise]);
};
