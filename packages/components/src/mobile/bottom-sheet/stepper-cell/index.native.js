/**
 * External dependencies
 */
import {
	AccessibilityInfo,
	View,
	Platform,
	PixelRatio,
	AppState,
} from 'react-native';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { Component } from '@wordpress/element';
import { withPreferredColorScheme } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import Cell from '../cell';
import Stepper from './stepper';
import styles from './style.scss';
import RangeTextInput from '../range-text-input';
import { toFixed, removeNonDigit } from '../../utils';

const STEP_DELAY = 200;
const DEFAULT_STEP = 1;

class BottomSheetStepperCell extends Component {
	constructor( props ) {
		super( props );

		this.announceValue = this.announceValue.bind( this );
		this.onDecrementValue = this.onDecrementValue.bind( this );
		this.onDecrementValuePressIn = this.onDecrementValuePressIn.bind(
			this
		);
		this.onIncrementValue = this.onIncrementValue.bind( this );
		this.onIncrementValuePressIn = this.onIncrementValuePressIn.bind(
			this
		);
		this.onPressOut = this.onPressOut.bind( this );

		const initialValue = this.validateInput(
			props.value || props.defaultValue || props.min
		);

		this.state = {
			inputValue: initialValue,
			stepperValue: initialValue,
		};
	}

	componentDidMount() {
		AppState.addEventListener( 'change', this.handleChangePixelRatio );
	}

	componentWillUnmount() {
		AppState.removeEventListener( 'change', this.handleChangePixelRatio );
		clearTimeout( this.timeout );
		clearInterval( this.interval );
		clearTimeout( this.timeoutAnnounceValue );
	}

	getFontScale() {
		return PixelRatio.getFontScale() < 1 ? 1 : PixelRatio.getFontScale();
	}

	handleChangePixelRatio( nextAppState ) {
		if ( nextAppState === 'active' ) {
			this.setState( { fontScale: this.getFontScale() } );
		}
	}

	validateInput( text ) {
		const { min, max, decimalNum } = this.props;
		if ( ! text ) {
			return min;
		}
		if ( typeof text === 'number' ) {
			if ( max ) {
				return Math.min( Math.max( text, min ), max );
			}
			return Math.max( text, min );
		}
		if ( max ) {
			return Math.min(
				Math.max( removeNonDigit( text, decimalNum ), min ),
				max
			);
		}
		return Math.max( removeNonDigit( text, decimalNum ), min );
	}

	updateValue( value ) {
		const { onChange } = this.props;
		const validValue = this.validateInput( value );

		this.announceValue( `${ validValue }` );
		onChange( validValue );
	}

	onChangeValue( initialValue ) {
		const { decimalNum } = this.props;
		initialValue = toFixed( initialValue, decimalNum );
		this.setState( { inputValue: initialValue } );
		this.updateValue( initialValue );
	}

	onIncrementValue() {
		const { step, max, onChange, value } = this.props;
		const newValue = value + step;

		if ( newValue <= max || max === undefined ) {
			onChange( newValue );
			this.setState( {
				inputValue: newValue,
			} );
			this.announceValue( newValue );
		}
	}

	onDecrementValue() {
		const { step, min, onChange, value } = this.props;
		const newValue = value - step;

		if ( newValue >= min ) {
			onChange( newValue );
			this.setState( {
				inputValue: newValue,
			} );
			this.announceValue( newValue );
		}
	}

	onIncrementValuePressIn() {
		this.onIncrementValue();
		this.timeout = setTimeout( () => {
			this.startPressInterval( this.onIncrementValue );
		}, 500 );
	}

	onDecrementValuePressIn() {
		this.onDecrementValue();
		this.timeout = setTimeout( () => {
			this.startPressInterval( this.onDecrementValue );
		}, 500 );
	}

	onPressOut() {
		clearTimeout( this.timeout );
		clearInterval( this.interval );
	}

	startPressInterval( callback, speed = STEP_DELAY ) {
		let counter = 0;
		this.interval = setInterval( () => {
			callback();
			counter += 1;

			if ( counter === 10 ) {
				clearInterval( this.interval );
				this.startPressInterval( callback, speed / 2 );
			}
		}, speed );
	}

	announceValue( value ) {
		const { label } = this.props;

		if ( Platform.OS === 'ios' ) {
			// On Android it triggers the accessibilityLabel with the value change
			clearTimeout( this.timeoutAnnounceValue );
			this.timeoutAnnounceValue = setTimeout( () => {
				AccessibilityInfo.announceForAccessibility(
					`${ value } ${ label }`
				);
			}, 300 );
		}
	}

	render() {
		const {
			label,
			icon,
			min,
			max,
			value,
			separatorType,
			children,
			shouldDisplayTextInput = false,
			rangePreview,
		} = this.props;
		const { inputValue } = this.state;
		const isMinValue = value === min;
		const isMaxValue = value === max;
		const labelStyle = [
			styles.cellLabel,
			! icon ? styles.cellLabelNoIcon : {},
		];
		const accessibilityLabel = sprintf(
			/* translators: accessibility text. Inform about current value. %1$s: Control label %2$s: Current value. */
			__( '%1$s. Current value is %2$s' ),
			label,
			value
		);

		return (
			<View
				accessible={ true }
				accessibilityRole="adjustable"
				accessibilityLabel={ accessibilityLabel }
				accessibilityActions={ [
					{ name: 'increment' },
					{ name: 'decrement' },
				] }
				onAccessibilityAction={ ( event ) => {
					switch ( event.nativeEvent.actionName ) {
						case 'increment':
							this.onIncrementValue();
							break;
						case 'decrement':
							this.onDecrementValue();
							break;
					}
				} }
			>
				<Cell
					accessibilityRole="none"
					accessible={ false }
					cellContainerStyle={ styles.cellContainerStyles }
					cellRowContainerStyle={ styles.cellRowStyles }
					disabled={ true }
					editable={ false }
					icon={ icon }
					label={ label }
					labelStyle={ labelStyle }
					leftAlign={ true }
					separatorType={ separatorType }
				>
					<Stepper
						isMaxValue={ isMaxValue }
						isMinValue={ isMinValue }
						onPressInDecrement={ this.onDecrementValuePressIn }
						onPressInIncrement={ this.onIncrementValuePressIn }
						onPressOut={ this.onPressOut }
						value={ value }
						shouldDisplayTextInput={ shouldDisplayTextInput }
					>
						{ shouldDisplayTextInput && (
							<RangeTextInput
								label={ label }
								onChange={ this.props.onChange }
								defaultValue={ `${ inputValue }` }
								value={ inputValue }
								min={ min }
								step={ 1 }
								decimalNum={ 1 }
							>
								{ children }
							</RangeTextInput>
						) }
					</Stepper>
					{ rangePreview }
				</Cell>
			</View>
		);
	}
}

BottomSheetStepperCell.defaultProps = {
	step: DEFAULT_STEP,
};

export default withPreferredColorScheme( BottomSheetStepperCell );
