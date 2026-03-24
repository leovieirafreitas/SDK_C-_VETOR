/*******************************************************************/
/*                                                                 */
/*                      GradientManipulator                        */
/*                                                                 */
/*******************************************************************/

#include "AEConfig.h"

#ifndef AE_OS_WIN
	#include "AE_General.r"
#endif

#include "AE_General.h"

resource 'PiPL' (16000) {
	{	/* array properties: 7 elements */
		/* [1] */
		Kind {
			AEGP
		},
		/* [2] */
		Name {
			"GradientManipulator"
		},
		/* [3] */
		Category {
			"General"
		},
		/* [4] */
		Version {
			65536
		},
		/* [5] */
		CodeWin64X86 {
			"EntryPointFunc"
		},
		/* [6] */
		AE_PiPL_Spec_Version {
			2,
			0
		},
		/* [7] */
		AE_Effect_Runtime_Flags {
			1
		}
	}
};
