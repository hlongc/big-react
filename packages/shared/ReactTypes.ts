export type Type = any;
export type Key = any;
export type Ref = { current: any } | ((instance: any) => void);
export type Props = any;
export type ElementType = any;

export interface ReactElementType {
	$$typeof: symbol | number;
	key: Key;
	ref: Ref;
	props: Props;
	type: ElementType;
	__mark: string;
}

export type Action<State> = State | ((prevState: State) => State);

export type ReactContext<T> = {
	$$typeof: symbol | number;
	Provider: ReactProviderType<T> | null;
	_currentValue: T | null;
};

export type ReactProviderType<T> = {
	_context: ReactContext<T>;
	$$typeof: symbol | number;
};
