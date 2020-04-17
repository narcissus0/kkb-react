import * as React from "react";
import warning from "rc-util/lib/warning";
import {InternalNamePath, NamePath, StoreValue} from "./interface";
import FieldContext from "./FieldContext.ts";
import Field from "./Field.tsx";
import {move, getNamePath} from "./utils/valueUtil.ts";

interface ListField {
  name: number;
  key: number;
}

interface ListOperations {
  add: (defaultValue?: StoreValue) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
}

interface ListProps {
  name: NamePath;
  children?: (
    fields: ListField[],
    operations: ListOperations
  ) => JSX.Element | React.ReactNode;
}

const List: React.FunctionComponent<ListProps> = ({name, children}) => {
  const context = React.useContext(FieldContext);
  const keyRef = React.useRef({
    keys: [],
    id: 0
  });
  const keyManager = keyRef.current;

  // User should not pass `children` as other type.
  if (typeof children !== "function") {
    warning(false, "Form.List only accepts function as children.");
    return null;
  }

  const parentPrefixName = getNamePath(context.prefixName) || [];
  const prefixName: InternalNamePath = [
    ...parentPrefixName,
    ...getNamePath(name)
  ];

  const shouldUpdate = (
    prevValue: StoreValue,
    nextValue: StoreValue,
    {source}
  ) => {
    if (source === "internal") {
      return false;
    }
    return prevValue !== nextValue;
  };

  return (
    <FieldContext.Provider value={{...context, prefixName}}>
      <Field name={[]} shouldUpdate={shouldUpdate}>
        {({value = [], onChange}) => {
          const {getFieldValue} = context;
          const getNewValue = () => {
            const values = getFieldValue(prefixName || []) as StoreValue[];
            return values || [];
          };
          /**
           * Always get latest value in case user update fields by `form` api.
           */
          const operations: ListOperations = {
            add: defaultValue => {
              // Mapping keys
              keyManager.keys = [...keyManager.keys, keyManager.id];
              keyManager.id += 1;

              const newValue = getNewValue();
              onChange([...newValue, defaultValue]);
            },
            remove: (index: number) => {
              const newValue = getNewValue();

              // Do not handle out of range
              if (index < 0 || index >= newValue.length) {
                return;
              }

              // Update key mapping
              const newKeys = keyManager.keys.map((key, id) => {
                if (id < index) {
                  return key;
                }
                return keyManager.keys[id + 1];
              });
              keyManager.keys = newKeys.slice(0, -1);

              // Trigger store change
              onChange(newValue.filter((_, id) => id !== index));
            },
            move(from: number, to: number) {
              if (from === to) {
                return;
              }
              const newValue = getNewValue();

              // Do not handle out of range
              if (
                from < 0 ||
                from >= newValue.length ||
                to < 0 ||
                to >= newValue.length
              ) {
                return;
              }

              keyManager.keys = move(keyManager.keys, from, to);

              // Trigger store change
              onChange(move(newValue, from, to));
            }
          };

          return children(
            (value as StoreValue[]).map(
              (__, index): ListField => {
                let key = keyManager.keys[index];
                if (key === undefined) {
                  keyManager.keys[index] = keyManager.id;
                  key = keyManager.keys[index];
                  keyManager.id += 1;
                }

                return {
                  name: index,
                  key
                };
              }
            ),
            operations
          );
        }}
      </Field>
    </FieldContext.Provider>
  );
};

export default List;