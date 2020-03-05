import { FETCH_WIN_TOTAL, UPDATE_WIN_TOTAL } from '../actions';

export default function (state = null, action) {
  switch (action.type) {
    // When fetching the win total, return the current win total. When
    // updating the win total, return the updated win total
    case FETCH_WIN_TOTAL:
    case UPDATE_WIN_TOTAL:
      return action.payload.data.total;

    // By default, return the current state of the win total
    default:
      return state;
  }
}
