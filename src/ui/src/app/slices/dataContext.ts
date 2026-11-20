/**
 * Data context slice: the data set (TEST or DEMO; its tenant follows) and the as-of date every read uses. Both are
 * remembered in the browser and read once when the store is created, so a refresh keeps them. Writing them is the
 * job of the actions in `../dataContextActions.ts`.
 */
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { DEFAULT_AS_OF, DEFAULT_DATA_SET } from '../../../../contracts/index';
import type { DataSetId } from '../../../../contracts/index';
import { readStoredAsOf, readStoredDataSet } from '../../lib/storage';

export interface DataContextState {
  readonly dataSet: DataSetId;
  /** `YYYY-MM-DD`. */
  readonly asOf: string;
}

function initialDataContext(): DataContextState {
  return {
    dataSet: readStoredDataSet() ?? DEFAULT_DATA_SET,
    asOf: readStoredAsOf() ?? DEFAULT_AS_OF,
  };
}

const dataContextSlice = createSlice({
  name: 'dataContext',
  initialState: initialDataContext,
  reducers: {
    dataSetChanged(state, action: PayloadAction<DataSetId>) {
      state.dataSet = action.payload;
    },
    asOfChanged(state, action: PayloadAction<string>) {
      state.asOf = action.payload;
    },
  },
});

export const { dataSetChanged, asOfChanged } = dataContextSlice.actions;
export const dataContextReducer = dataContextSlice.reducer;
