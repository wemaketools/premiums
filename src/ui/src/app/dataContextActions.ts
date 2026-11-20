/**
 * Data context actions that remember their result in the browser and make every mounted query read again.
 */
import type { DataSetId } from '../../../contracts/index';
import { invalidateApiQueries } from '../api/hooks';
import { storeAsOf, storeDataSet } from '../lib/storage';
import { asOfChanged, dataSetChanged } from './slices/dataContext';
import type { AppDispatch } from './store';

export function chooseDataSet(dataSet: DataSetId) {
  return (dispatch: AppDispatch): void => {
    storeDataSet(dataSet);
    dispatch(dataSetChanged(dataSet));
    invalidateApiQueries();
  };
}

export function chooseAsOf(asOf: string) {
  return (dispatch: AppDispatch): void => {
    storeAsOf(asOf);
    dispatch(asOfChanged(asOf));
    invalidateApiQueries();
  };
}
